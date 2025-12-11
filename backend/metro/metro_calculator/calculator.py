import pandas as pd
import numpy as np
from pathlib import Path  # <--- To jest kluczowe


# ---------------------------------------------------------
# FUNKCJA POMOCNICZA: SZUKANIE PLIKÓW
# ---------------------------------------------------------
def get_file_path(filename):
    """
    Szuka pliku w folderze 'data' idąc w górę drzewa katalogów.
    Rozwiązuje problem "No such file or directory".
    """
    current_path = Path(__file__).resolve()
    # Zaczynamy szukać od folderu rodzica i idziemy w górę
    search_path = current_path.parent

    for _ in range(5):  # Sprawdzamy do 5 poziomów w górę
        candidate = search_path / 'data' / filename
        if candidate.exists():
            return str(candidate)

        # Jeśli dotarliśmy do roota dysku, przerywamy
        if search_path.parent == search_path:
            break
        search_path = search_path.parent

    # Jeśli nie znaleziono automatycznie, zwracamy samą nazwę (może zadziała lokalnie)
    # Ale wypisujemy ostrzeżenie w konsoli
    print(f"⚠️ OSTRZEŻENIE: Nie znaleziono automatycznie ścieżki do {filename}")
    return filename


# ---------------------------------------------------------
# KROK 1: WCZYTANIE I PRZYGOTOWANIE DANYCH
# ---------------------------------------------------------

def load_and_prep_data():
    """
    Wczytuje pliki CSV i przygotowuje struktury danych.
    """
    # Używamy funkcji pomocniczej do znalezienia pełnych ścieżek
    files = {
        'pop': get_file_path('ludnosc_wokolo_punktow.csv'),
        'traffic_profile': get_file_path('godzinowe_natezenie_ruchu.csv'),
        'metro_lines': get_file_path('line_distance.csv'),
        'stations_traffic': get_file_path('współrzędne 26 pkt metra.csv')
    }

    print("--- DIAGNOSTYKA ŚCIEŻEK ---")
    for k, v in files.items():
        print(f"Plik [{k}]: {v}")
    print("---------------------------")

    # Wczytanie danych
    try:
        df_pop = pd.read_csv(files['pop'])
        df_profile = pd.read_csv(files['traffic_profile'])
        df_lines = pd.read_csv(files['metro_lines'])
        df_stations = pd.read_csv(files['stations_traffic'])
    except FileNotFoundError as e:
        print(f"\n❌ BŁĄD KRYTYCZNY: Nie udało się otworzyć pliku mimo prób znalezienia ścieżki.")
        print(f"Szczegóły: {e}")
        return None
    except Exception as e:
        print(f"\n❌ INNY BŁĄD przy wczytywaniu: {e}")
        return None

    # --- Przygotowanie danych stacji (Ruch i Przepustowość) ---
    col_map = {str(i): i for i in range(24)}
    df_stations.rename(columns=col_map, inplace=True)
    df_stations['ID'] = pd.to_numeric(df_stations['ID'], errors='coerce').fillna(0).astype(int)
    df_stations.set_index('ID', inplace=True)

    # --- Przygotowanie danych ludnościowych ---
    name_to_id = df_stations.reset_index().set_index('Nazwa')['ID'].to_dict()

    df_pop['ID'] = df_pop['nazwa'].map(name_to_id)
    df_pop = df_pop.dropna(subset=['ID'])
    df_pop['ID'] = df_pop['ID'].astype(int)
    df_pop.set_index('ID', inplace=True)

    # --- Przygotowanie profilu godzinowego ---
    traffic_profile = df_profile.iloc[0].values
    if isinstance(traffic_profile[0], str):
        traffic_profile = [float(x.replace(',', '.')) for x in traffic_profile]
    traffic_profile = np.array(traffic_profile)
    if traffic_profile.sum() > 0:
        traffic_profile = traffic_profile / traffic_profile.sum()

    # --- Przygotowanie mapy odległości ---
    dist_map = {}
    for _, row in df_lines.iterrows():
        n1, n2 = row['Location1'], row['Location2']
        dist = row['Distance_km']
        id1 = name_to_id.get(n1)
        id2 = name_to_id.get(n2)
        if id1 and id2:
            dist_map[(id1, id2)] = dist
            dist_map[(id2, id1)] = dist

    print("✅ Dane wczytane pomyślnie.")
    return df_stations, df_pop, traffic_profile, dist_map



# Ładujemy dane globalnie raz, aby funkcje miały do nich dostęp
DATA = load_and_prep_data()


# ---------------------------------------------------------
# KROK 2: FUNKCJA 1 - UŻYCIE NA PODSTAWIE LUDNOŚCI
# ---------------------------------------------------------

def calculate_population_usage(station_ids, overrides=None):
    """
    Oblicza liczbę pasażerów generowaną przez okoliczną ludność dla listy stacji (station_ids).
    Uwzględnia konkurencję (autobus/tramwaj) oraz strukturę odległości zamieszkania.

    Argumenty:
        station_ids (list): Lista ID stacji do przeliczenia.
        overrides (dict, opcjonalnie): Słownik {ID_Stacji: nowy_współczynnik},
                                       pozwalający ręcznie nadpisać % wyboru metra dla testów.

    Zwraca:
        Słownik {ID_Stacji: [lista_24_wartości_pasażerów_na_godzinę]}
    """

    # Rozpakowanie globalnych danych (muszą być wcześniej wczytane funkcją load_and_prep_data)
    # df_stations: dane stacji, df_pop: dane ludności i transportu, traffic_profile: rozkład godzinowy
    _, df_pop, traffic_profile, _ = DATA

    results = {}

    # --- STAŁE MODELU ---
    # Wagi atrakcyjności dojścia pieszego w zależności od strefy
    W_300 = 1.00  # 0-300m: 100% chętnych do dojścia
    W_500 = 0.80  # 300-500m: 80% chętnych
    W_800 = 0.45  # 500-800m: 45% chętnych

    # Wskaźnik mobilności (liczba podróży/osobę/dobę)
    # Przyjęto 1.7 jako średnią dla dużych miast (uwzględnia pracę, szkołę, zakupy itp.)
    MOBILITY_RATE = 1.7

    # Bazowy udział transportu zbiorowego w podróżach (Modal Split)
    # 58% zgodnie z danymi dla Warszawy/Krakowa (zbiorkom vs auto)
    PUT_SHARE = 0.58

    for sid in station_ids:
        # Domyślnie zerowy ruch, jeśli stacji nie ma w bazie ludności
        hourly_pax = [0] * 24

        if sid in df_pop.index:
            row = df_pop.loc[sid]

            # --- 1. USTALENIE WSPÓŁCZYNNIKA WYBORU METRA ---
            # Sprawdzamy, czy w pobliżu są inne środki transportu (kolumny w pliku CSV)
            try:
                has_bus = int(row.get('autobus', 0))
                has_tram = int(row.get('tramwaj', 0))
            except ValueError:
                # Zabezpieczenie na wypadek błędnych danych
                has_bus = 0
                has_tram = 0

            # Logika decyzyjna (Metro vs Autobus/Tramwaj)
            if has_bus == 1 and has_tram == 1:
                # Silna konkurencja: węzeł przesiadkowy, metro jest jedną z opcji
                metro_choice = 0.25
            elif has_bus == 1 and has_tram == 0:
                # Konkurencja tylko z autobusem: metro zazwyczaj wygrywa szybkością
                metro_choice = 0.35
            elif has_bus == 0 and has_tram == 1:
                # Konkurencja tylko z tramwajem: metro szybsze, ale tramwaj dostępniejszy
                metro_choice = 0.30
            else:
                # Brak konkurencji: metro jest jedynym sensownym wyborem zbiorkomu
                metro_choice = 0.60

                # Możliwość ręcznego nadpisania współczynnika dla konkretnej stacji
            if overrides and sid in overrides:
                metro_choice = overrides[sid]

            # --- 2. OBLICZENIE EFEKTYWNEJ POPULACJI ---
            # Funkcja pomocnicza do czyszczenia danych liczbowych (usuwanie spacji, np. "1 000")
            def clean_val(val):
                if pd.isnull(val): return 0.0
                if isinstance(val, str):
                    return float(val.replace(' ', '').replace(',', '.'))
                return float(val)

            p300 = clean_val(row['pop_300m'])
            p500 = clean_val(row['pop_500m'])
            p800 = clean_val(row['pop_800m'])

            # Obliczamy liczbę ludzi w pierścieniach (dane w pliku są kumulatywne)
            ring_0_300 = p300
            ring_300_500 = max(0, p500 - p300)
            ring_500_800 = max(0, p800 - p500)

            # Ważona suma populacji (im dalej, tym mniejsza waga)
            eff_pop = (ring_0_300 * W_300) + \
                      (ring_300_500 * W_500) + \
                      (ring_500_800 * W_800)

            # --- 3. OBLICZENIE POPYTU ---
            # Wzór: Efektywna_Ludność * Mobilność * %_Zbiorkom * %_Wybór_Metra
            daily_demand = eff_pop * MOBILITY_RATE * PUT_SHARE * metro_choice

            # Rozkład na godziny zgodnie z profilem ruchu (np. szczyt poranny i popołudniowy)
            hourly_pax = [int(daily_demand * p) for p in traffic_profile]

        results[sid] = hourly_pax

    return results
# ---------------------------------------------------------
# KROK 3: FUNKCJA 2 - PRZESIADKA Z AUT (MODAL SPLIT)
# ---------------------------------------------------------

def calculate_modal_shift(station_ids):
    """
    Oblicza liczbę kierowców, którzy przesiądą się do metra (Model Logitowy).
    Zwraca: Słownik {ID_Stacji: [lista_24_godziny]}
    """
    df_stations, _, _, dist_map = DATA
    results = {}

    # Parametry modelu (zgodne z WBR 2015 i przykładem)
    OCCUPANCY = 1.3  # osób na samochód
    AUTO_SHARE_BASELINE = 0.44  # bazowy udział aut w podróżach
    BETA_TIME = -0.04  # wrażliwość na czas
    METRO_BONUS = 0.5  # stała atrakcyjności metra

    # Parametry sieci
    FREE_SPEED_AUTO = 50.0  # km/h (prędkość swobodna)
    METRO_SPEED = 35.0  # km/h (prędkość komunikacyjna metra)
    METRO_ACCESS = 10.0  # min (czas dojścia/oczekiwania)

    # Funkcja pomocnicza do ustalenia długości podróży dla danej stacji
    # (szuka odległości do następnej lub poprzedniej stacji w liście ID)
    def get_trip_distance(curr_id, idx, id_list):
        # Domyślnie 2km (z przykładu), jeśli nie znajdziemy w pliku
        dist = 2.0

        # Sprawdź następną stację
        if idx < len(id_list) - 1:
            next_id = id_list[idx + 1]
            if (curr_id, next_id) in dist_map:
                return dist_map[(curr_id, next_id)]

        # Sprawdź poprzednią stację (dla ostatniej na liście)
        if idx > 0:
            prev_id = id_list[idx - 1]
            if (curr_id, prev_id) in dist_map:
                return dist_map[(curr_id, prev_id)]

        return dist

    for idx, sid in enumerate(station_ids):
        hourly_shift = [0] * 24

        if sid in df_stations.index:
            row = df_stations.loc[sid]

            # Pobranie przepustowości skrzyżowania (C)
            cap_str = str(row['przepustowosc']).replace(' ', '')
            capacity = float(cap_str) if cap_str and cap_str != 'nan' else 3000.0

            # Dystans "reprezentatywnej podróży" przez to skrzyżowanie
            dist_km = get_trip_distance(sid, idx, station_ids)

            # Stały czas podróży metrem (niezależny od korków) [cite: 8645]
            # T_metro = (Dystans / V_metro) + Dojście
            t_metro = (dist_km / METRO_SPEED) * 60 + METRO_ACCESS
            # Użyteczność Metra (stała)
            u_metro = (BETA_TIME * t_metro) + METRO_BONUS

            # Obliczenia dla każdej godziny
            for h in range(24):
                try:
                    vol_car = float(row[h])  # Natężenie ruchu (Q)
                except:
                    vol_car = 0

                if vol_car <= 0 or capacity <= 0:
                    continue

                # 1. Odtworzenie całkowitej puli podróżnych [cite: 10696]
                # Zakładamy, że obecny ruch aut to 44% ogółu podróżnych
                people_in_cars_now = vol_car * OCCUPANCY
                total_travelers_pool = people_in_cars_now / AUTO_SHARE_BASELINE

                # 2. Obliczenie czasu auta w korku (Funkcja BPR)
                # t_cur = t_0 * (1 + alpha * (vol/cap)^beta)
                # t_0 = (Dystans / V_free)
                t_auto_free = (dist_km / FREE_SPEED_AUTO) * 60
                saturation = vol_car / capacity

                # Używamy parametrów inżynierskich dla miasta (a=0.5, b=4)
                t_auto_cur = t_auto_free * (1 + 0.5 * (saturation ** 4))

                # 3. Użyteczność Auta (zmienna w czasie) [cite: 10054]
                u_auto = BETA_TIME * t_auto_cur

                # 4. Nowy podział rynku (Model Logitowy)
                exp_auto = np.exp(u_auto)
                exp_metro = np.exp(u_metro)

                # Prawdopodobieństwo wyboru auta w nowym scenariuszu
                prob_auto_new = exp_auto / (exp_auto + exp_metro)

                # 5. Obliczenie liczby osób, które zrezygnowały z auta
                people_in_cars_new = total_travelers_pool * prob_auto_new
                shift = max(0, people_in_cars_now - people_in_cars_new)

                hourly_shift[h] = int(shift)

        results[sid] = hourly_shift

    return results


# ---------------------------------------------------------
# KROK 4: GŁÓWNA FUNKCJA SUMUJĄCA
# ---------------------------------------------------------

def calculate_total_metro_usage(station_ids):
    """
    Główna funkcja wywoływana przez użytkownika.
    Argumenty:
        station_ids (list[int]): Lista ID stacji metra (np. [1, 2, 5])
    Zwraca:
        Słownik {ID_Stacji: [lista_24_liczb_pasażerów]}
    """
    if DATA is None:
        return "Błąd danych wejściowych"

    # Wywołanie dwóch pod-funkcji
    usage_from_pop = calculate_population_usage(station_ids)
    usage_from_shift = calculate_modal_shift(station_ids)

    total_usage = {}

    # Sumowanie wyników
    for sid in station_ids:
        list_pop = usage_from_pop.get(sid, [0] * 24)
        list_shift = usage_from_shift.get(sid, [0] * 24)

        # Sumowanie element po elemencie (godzina po godzinie)
        total_list = [p + s for p, s in zip(list_pop, list_shift)]
        total_usage[sid] = total_list

    return total_usage


def print_tabular_results(results_dict):
    """
    Wypisuje wyniki w formie czytelnej tabeli tekstowej 2D.
    Wiersze = Stacje, Kolumny = Godziny (0-23).
    """
    if not results_dict:
        print("Brak danych.")
        return

    # 1. Konwersja słownika wyników na DataFrame
    # orient='index' sprawia, że klucze słownika (ID stacji) stają się wierszami
    df_results = pd.DataFrame.from_dict(results_dict, orient='index')

    # 2. Dodanie nazw kolumn (godziny)
    df_results.columns = [f"{h}:00" for h in range(24)]

    # 3. (Opcjonalnie) Mapowanie ID na Nazwy Stacji dla czytelności
    try:
        # Pobieramy globalne dane, żeby mieć nazwy stacji
        df_stations_info = DATA[0]
        id_to_name = df_stations_info['Nazwa'].to_dict()

        # Dodajemy kolumnę z nazwą na początek lub zmieniamy indeks
        df_results.index = df_results.index.map(lambda x: f"{x}: {id_to_name.get(x, 'Stacja ' + str(x))}")
        df_results.index.name = "Stacja"
    except Exception:
        df_results.index.name = "ID"

    # 4. Wypisanie tabeli
    print("\n" + "=" * 80)
    print("TABELA WYNIKOWA: Pasażerowie na godzinę")
    print("=" * 80)

    # pd.option_context pozwala wypisać całą tabelę bez skracania (bez kropek ...)
    with pd.option_context('display.max_rows', None, 'display.max_columns', None, 'display.width', 1000):
        print(df_results)
    print("=" * 80 + "\n")

if __name__ == "__main__":
    # 1. Lista ID do sprawdzenia
    test_ids = [1, 3,4, 5, 8,11,15,17,18, 26]

    print(f"Obliczam dla ID: {test_ids}...")

    # 2. Obliczenia
    wyniki = calculate_total_metro_usage(test_ids)

    # 3. WYPISANIE TABELI 2D
    print_tabular_results(wyniki)

    # 4. (Opcjonalnie) Jeśli potrzebujesz tej tabeli jako "surowej" listy list w Pythonie:
    raw_2d_list = [dane_stacji for dane_stacji in wyniki.values()]
    # print("Surowa lista list:", raw_2d_list)