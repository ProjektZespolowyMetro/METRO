import unittest
from unittest.mock import patch
import pandas as pd
import numpy as np

# Importujemy funkcje z Twojego pliku (zakładam nazwę metro_model.py)
# Jeśli Twój plik nazywa się inaczej, zmień tę linię!
import calculator


class TestMetroModel(unittest.TestCase):

    def setUp(self):
        """
        Przygotowanie sztucznych danych (MOCK) przed każdym testem.
        Tworzymy strukturę identyczną jak ta zwracana przez load_and_prep_data().
        """
        # 1. Mock Danych Stacji (Ruch aut i przepustowość)
        # Tworzymy stację ID=1 i ID=2
        data_stations = {
            'przepustowosc': [1000, 2000],  # Stacja 1 ma małą przepustowość, Stacja 2 dużą
            # Generujemy ruch aut: 0 w nocy, 2000 w szczycie (godz 8)
            8: [2000, 500],
        }
        # Wypełniamy pozostałe godziny zerami
        for h in range(24):
            if h != 8:
                data_stations[h] = [0, 0]

        df_stations = pd.DataFrame(data_stations, index=[1, 2])
        df_stations.index.name = 'ID'

        # 2. Mock Danych Ludnościowych
        # Stacja 1: Tylko metro (brak bus/tram), 1000 osób w strefie 0-300m
        # Stacja 2: Metro + Bus + Tram, 1000 osób w strefie 0-300m
        data_pop = {
            'pop_300m': [1000, 1000],
            'pop_500m': [1000, 1000],  # Brak dodatkowych ludzi w dalszych strefach dla uproszczenia
            'pop_800m': [1000, 1000],
            'autobus': [0, 1],
            'tramwaj': [0, 1]
        }
        df_pop = pd.DataFrame(data_pop, index=[1, 2])

        # 3. Mock Profilu Ruchu
        # Zakładamy, że 100% ruchu odbywa się o godzinie 8:00 (dla łatwego liczenia)
        traffic_profile = np.zeros(24)
        traffic_profile[8] = 1.0

        # 4. Mock Mapy Odległości
        # Odległość między stacją 1 a 2 to 5 km
        dist_map = {
            (1, 2): 5.0,
            (2, 1): 5.0
        }

        # Zapisujemy tuple danych do zmiennej, którą będziemy wstrzykiwać
        self.mock_data = (df_stations, df_pop, traffic_profile, dist_map)

    @patch('calculator.DATA')
    def test_calculate_population_usage_logic(self, mock_data_ref):
        """
        Testuje czy popyt z ludności jest liczony poprawnie (wzory + współczynniki).
        """
        # Podstawiamy nasze sztuczne dane pod zmienną globalną w module
        mock_data_ref.__iter__.side_effect = lambda: iter(self.mock_data)  # Symulacja rozpakowania krotki

        # Wywołujemy funkcję dla stacji 1 i 2
        results = calculator.calculate_population_usage([1, 2])

        # --- WERYFIKACJA DLA STACJI 1 (Brak konkurencji) ---
        # Dane: 1000 os (300m) * 1.0 (waga) * 1.7 (mobilność) * 0.58 (share) * 0.60 (metro choice)
        # Oczekiwane: 1000 * 1.7 * 0.58 * 0.60 = 591.6 pasażerów/dobę
        # Ponieważ profil to 100% o godz 8:00, wynik w [8] powinien wynosić int(591.6) -> 591
        expected_pax_1 = int(1000 * 1.7 * 0.58 * 0.60)
        self.assertEqual(results[1][8], expected_pax_1,
                         f"Błąd dla stacji bez konkurencji. Oczekiwano {expected_pax_1}, jest {results[1][8]}")

        # --- WERYFIKACJA DLA STACJI 2 (Silna konkurencja Bus+Tram) ---
        # Współczynnik wyboru metra spada do 0.25
        # Oczekiwane: 1000 * 1.7 * 0.58 * 0.25 = 246.5 -> 246
        expected_pax_2 = int(1000 * 1.7 * 0.58 * 0.25)
        self.assertEqual(results[2][8], expected_pax_2,
                         f"Błąd dla stacji z konkurencją. Oczekiwano {expected_pax_2}, jest {results[2][8]}")

        # Sprawdzenie innej godziny (powinno być 0)
        self.assertEqual(results[1][12], 0)

    @patch('calculator.DATA')
    def test_calculate_modal_shift_congestion(self, mock_data_ref):
        """
        Testuje czy model logitowy reaguje na korki (przesiadka z auta).
        """
        mock_data_ref.__iter__.side_effect = lambda: iter(self.mock_data)

        results = calculator.calculate_modal_shift([1, 2])

        # --- STACJA 1: Duży korek ---
        # Ruch aut (2000) > Przepustowość (1000). Saturation = 2.0.
        # Czas auta drastycznie rośnie -> Użyteczność auta spada -> Duża przesiadka.
        shift_station_1 = results[1][8]
        self.assertTrue(shift_station_1 > 0, "Powinna nastąpić przesiadka przy dużym korku")

        # --- STACJA 2: Brak korka ---
        # Ruch aut (500) < Przepustowość (2000). Saturation = 0.25.
        # Czas auta jest bliski swobodnemu. Przesiadka powinna być mniejsza (lub zerowa, zależnie od parametrów).
        shift_station_2 = results[2][8]

        # Przesiadka na stacji 1 (zakorkowanej) powinna być znacznie większa niż na stacji 2
        # (przy założeniu podobnej liczby aut, tu stacja 1 ma więcej aut, więc efekt jest spotęgowany,
        # ale sprawdzamy sam fakt, że mechanizm działa).
        self.assertGreater(shift_station_1, shift_station_2)

    @patch('calculator.DATA')
    def test_calculate_total_sum(self, mock_data_ref):
        """
        Testuje czy funkcja główna poprawnie sumuje wyniki z dwóch podfunkcji.
        """
        mock_data_ref.__iter__.side_effect = lambda: iter(self.mock_data)

        # Pobieramy wyniki cząstkowe
        pop_res = calculator.calculate_population_usage([1])
        shift_res = calculator.calculate_modal_shift([1])

        # Pobieramy wynik główny
        total_res = calculator.calculate_total_metro_usage([1])

        # Sprawdzamy godzinę 8:00
        val_pop = pop_res[1][8]
        val_shift = shift_res[1][8]
        val_total = total_res[1][8]

        self.assertEqual(val_total, val_pop + val_shift, "Suma końcowa nie zgadza się ze składnikami")

    @patch('calculator.DATA')
    def test_override_coefficients(self, mock_data_ref):
        """
        Testuje czy ręczne nadpisanie współczynników (overrides) działa.
        """
        mock_data_ref.__iter__.side_effect = lambda: iter(self.mock_data)

        # Nadpisujemy stację 1, żeby 100% (1.0) ludzi zbiorkomu wybrało metro (zamiast 0.6)
        overrides = {1: 1.0}
        results = calculator.calculate_population_usage([1], overrides=overrides)

        expected = int(1000 * 1.7 * 0.58 * 1.0)
        self.assertEqual(results[1][8], expected, "Override współczynnika nie zadziałał")


if __name__ == '__main__':
    unittest.main()