import pandas as pd
import numpy as np
import math
import os
from pathlib import Path
from core.scripts.bus_tram_availability import calculate_bus_tram_for_pins

# Próba importu funkcji liczącej ludność (zakładamy strukturę Django)
try:
    from core.scripts.area_population import calculate_population_for_pins
except ImportError:
    # Fallback dla testów lokalnych poza Django
    try:
        from area_population import calculate_population_for_pins
    except ImportError:
        print("UWAGA: Nie można zaimportować area_population. Obliczenia ludności mogą nie działać.")
        calculate_population_for_pins = None



# KONFIGURACJA I PLIKI


def get_file_path(filename):
    """Szuka pliku w katalogu bieżącym lub w folderze data w górę."""
    current_dir = Path(__file__).resolve().parent


    if (current_dir / filename).exists():
        return str(current_dir / filename)
    search_path = current_dir
    for _ in range(4):
        candidate = search_path / 'data' / filename
        if candidate.exists():
            return str(candidate)
        if search_path.parent == search_path:
            break
        search_path = search_path.parent

    # ścieżka względna
    return filename


def load_reference_data():
    """Wczytuje dane referencyjne (profil ruchu i punkty pomiarowe)."""
    traffic_file = get_file_path('współrzędne 26 pkt metra.csv')
    profile_file = get_file_path('godzinowe_natezenie_ruchu.csv')

    try:
        # Wczytanie punktów pomiarowych (do szukania najbliższego sąsiada)
        df_traffic = pd.read_csv(traffic_file)

        # Wczytanie profilu godzinowego
        df_profile = pd.read_csv(profile_file)
        profile_row = df_profile.iloc[0].values

        # Konwersja profilu (zamiana przecinków na kropki jeśli są stringami)
        traffic_profile = []
        for val in profile_row:
            if isinstance(val, str):
                traffic_profile.append(float(val.replace(',', '.')))
            else:
                traffic_profile.append(float(val))

        traffic_profile = np.array(traffic_profile)
        if traffic_profile.sum() > 0:
            traffic_profile = traffic_profile / traffic_profile.sum()  # Normalizacja

        return df_traffic, traffic_profile

    except Exception as e:
        print(f"Błąd ładowania danych referencyjnych: {e}")
        return None, None


# Ładujemy dane raz przy starcie modułu
REF_TRAFFIC_POINTS, TRAFFIC_PROFILE = load_reference_data()




def haversine_distance(lat1, lon1, lat2, lon2):
    """Zwraca odległość w kilometrach."""
    R = 6371  # Promień Ziemi w km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) * math.sin(d_lat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) * math.sin(d_lon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def find_nearest_traffic_point(lat, lng, df_points):
    """Znajduje najbliższy punkt pomiarowy z pliku CSV."""
    if df_points is None or df_points.empty:
        return None

    # Prosta odległość euklidesowa wystarczy do znalezienia najbliższego punktu
    # (dla małych odległości błąd względem Haversine jest pomijalny przy sortowaniu)
    distances = ((df_points['N'] - lat) ** 2 + (df_points['E'] - lng) ** 2)
    nearest_idx = distances.idxmin()
    return df_points.iloc[nearest_idx]


def calculate_usage_from_population(stations_to_calculate, profile, all_stations=None):
    """
    Oblicza potoki pasażerskie na podstawie ludności wokół pinezek.

    Args:
        stations_to_calculate: Lista przystanków do obliczenia
        profile: Profil godzinowy
        all_stations: (opcjonalnie) Pełna lista przystanków linii (dla kontekstu)
    """
    if all_stations is None:
        all_stations = stations_to_calculate

    results = {}

    # Stałe z oryginalnego skryptu
    W_300 = 1.00
    W_500 = 0.80
    W_800 = 0.45
    MOBILITY_RATE = 1.7
    PUT_SHARE = 0.58

    # Wywołujemy skrypt area_population
    if calculate_population_for_pins:
        pop_data = calculate_population_for_pins(stations_to_calculate)
    else:
        pop_data = {}

    # Obliczenia dla bus_tram (tylko dla przystanków do obliczenia)
    bus_tram_info = calculate_bus_tram_for_pins(stations_to_calculate)

    for pin in stations_to_calculate:
        pin_num = pin.get('number')

        # Pobieramy dane o ludności
        p_info = pop_data.get(pin_num, {})

        if not p_info:
            p_info = {
                'pop_300m': pin.get('pop_300m', 0),
                'pop_500m': pin.get('pop_500m', 0),
                'pop_800m': pin.get('pop_800m', 0)
            }

        p300 = float(p_info.get('pop_300m', 0))
        p500 = float(p_info.get('pop_500m', 0))
        p800 = float(p_info.get('pop_800m', 0))

        # Obliczanie pierścieni
        ring_0_300 = p300
        ring_300_500 = max(0, p500 - p300)
        ring_500_800 = max(0, p800 - p500)

        eff_pop = (ring_0_300 * W_300) + (ring_300_500 * W_500) + (ring_500_800 * W_800)

        # Wybór metra z informacji o dostępności
        metro_choice = bus_tram_info.get(pin_num, {}).get('metro_choice', 0.45)

        daily_demand = eff_pop * MOBILITY_RATE * PUT_SHARE * metro_choice

        # Rozkład godzinowy
        if profile is not None:
            hourly_pax = [int(daily_demand * p) for p in profile]
        else:
            hourly_pax = [0] * 24

        results[pin_num] = hourly_pax

    return results


def calculate_usage_from_modal_shift(stations_to_calculate, df_traffic_points, all_stations=None):
    """
    Oblicza przesiadkę z samochodów dla wybranych przystanków.

    Args:
        stations_to_calculate: Lista przystanków do obliczenia
        df_traffic_points: Dane o ruchu
        all_stations: (opcjonalnie) Pełna lista przystanków linii (dla kontekstu sąsiadów)
    """
    if all_stations is None:
        all_stations = stations_to_calculate

    results = {}

    # Stałe modelu
    OCCUPANCY = 1.3
    AUTO_SHARE_BASELINE = 0.44
    BETA_TIME = -0.04
    METRO_BONUS = 0.5
    METRO_SPEED = 35.0  # km/h
    METRO_ACCESS = 5.0  # min

    # Sortujemy PEŁNĄ linię po numerze, żeby znaleźć sąsiadów
    sorted_all_stations = sorted(all_stations, key=lambda x: x.get('number', 0))

    for pin in stations_to_calculate:
        pin_num = pin.get('number')
        hourly_shift = [0] * 24

        # 1. Znajdź najbliższy punkt z danymi o ruchu
        traffic_data = find_nearest_traffic_point(pin['lat'], pin['lng'], df_traffic_points)

        if traffic_data is not None:
            # Pobierz przepustowość
            try:
                cap_str = str(traffic_data.get('przepustowość', 3000))
                capacity = float(cap_str.replace(' ', ''))
            except:
                capacity = 3000.0

            # 2. Oblicz parametry podróży (Metro vs Auto)
            # Szukamy sąsiadów w PEŁNEJ linii, nie tylko w stations_to_calculate
            try:
                idx = next(i for i, s in enumerate(sorted_all_stations)
                           if s.get('number') == pin_num)
            except StopIteration:
                results[pin_num] = hourly_shift
                continue

            # Szukamy następnego i poprzedniego sąsiada z PEŁNEJ linii
            dist_km = 2.0  # Domyślnie

            next_pin = sorted_all_stations[idx + 1] if idx < len(sorted_all_stations) - 1 else None
            prev_pin = sorted_all_stations[idx - 1] if idx > 0 else None

            neighbor = next_pin if next_pin else prev_pin

            if neighbor:
                dist_km = haversine_distance(pin['lat'], pin['lng'],
                                             neighbor['lat'], neighbor['lng'])

            # Czas metrem
            t_metro = (dist_km / METRO_SPEED) * 60 + METRO_ACCESS
            u_metro = (BETA_TIME * t_metro) + METRO_BONUS

            # Czas autem (Free flow)
            auto_free_min = (dist_km / 30.0) * 60

            # 3. Pętla godzinowa
            for h in range(24):
                col_name = str(h)
                if col_name not in traffic_data:
                    continue

                try:
                    vol_car = float(traffic_data[col_name])
                except:
                    vol_car = 0

                if vol_car <= 0 or capacity <= 0:
                    continue

                # Model Logitowy & BPR
                people_in_cars_now = vol_car * OCCUPANCY
                total_travelers = people_in_cars_now / AUTO_SHARE_BASELINE

                # Funkcja BPR (czas w korku)
                saturation = vol_car / capacity
                t_auto_cur = auto_free_min * (1 + 0.5 * (saturation ** 4))

                u_auto = BETA_TIME * t_auto_cur

                exp_auto = np.exp(u_auto)
                exp_metro = np.exp(u_metro)

                # Prawdopodobieństwo wyboru auta po wprowadzeniu metra
                prob_auto_new = exp_auto / (exp_auto + exp_metro)

                people_in_cars_new = total_travelers * prob_auto_new

                # Różnica to pasażerowie, którzy przesiedli się do metra
                shift = max(0, people_in_cars_now - people_in_cars_new)
                hourly_shift[h] = int(shift)

        results[pin_num] = hourly_shift

    return results


def calculate_metro_usage_for_single_station(new_station, all_existing_stations):
    """
    Oblicza użycie metra dla jednego konkretnego nowego przystanku
    oraz jego sąsiadów (ponieważ nowy przystanek wpływa na ich obciążenie).

    Args:
        new_station: dict z nowym przystankiem (number, name, lat, lng)
        all_existing_stations: Lista WSZYSTKICH istniejących przystanków (całej linii!)

    Returns:
        list: Lista dict'ów z przystankami (nowy + jego sąsiedzi)
    """
    if not new_station:
        return []

    new_num = new_station.get('number')

    # Połącz CAŁĄ linię: wszystkie istniejące + nowy
    all_stations = all_existing_stations + [new_station]
    sorted_stations = sorted(all_stations, key=lambda x: x.get('number', 0))

    # Znajdź indeks nowego przystanku
    try:
        idx = next(i for i, s in enumerate(sorted_stations) if s.get('number') == new_num)
    except StopIteration:
        return []

    # Zbierz TYLKO przystanki do obliczenia (nowy + jego bezpośredni sąsiedzi)
    stations_to_calculate = [new_station]
    return_pin_numbers = {new_num}

    if idx > 0:
        prev_station = sorted_stations[idx - 1]
        stations_to_calculate.append(prev_station)
        return_pin_numbers.add(prev_station.get('number'))

    if idx < len(sorted_stations) - 1:
        next_station = sorted_stations[idx + 1]
        stations_to_calculate.append(next_station)
        return_pin_numbers.add(next_station.get('number'))

    # Obliczenia z ludności - tylko dla wybranych, ale z kontekstem całej linii
    usage_pop = calculate_usage_from_population(
        stations_to_calculate,
        TRAFFIC_PROFILE,
        all_stations=all_stations  # Przekazujemy pełną linię dla kontekstu
    )

    # Obliczenia z przesiadki - tylko dla wybranych, ale z kontekstem całej linii
    usage_shift = calculate_usage_from_modal_shift(
        stations_to_calculate,
        REF_TRAFFIC_POINTS,
        all_stations=all_stations  # Przekazujemy pełną linię dla kontekstu
    )

    # Sumowanie wyników - tylko dla przystanków do zwrócenia
    result_list = []
    for pin_num in sorted(return_pin_numbers):
        pop_arr = usage_pop.get(pin_num, [0] * 24)
        shift_arr = usage_shift.get(pin_num, [0] * 24)
        total_arr = [int(p + s) for p, s in zip(pop_arr, shift_arr)]

        # Znajdź nazwę przystanku
        station_name = next(
            (s.get('name', f"Station {pin_num}")
             for s in all_stations
             if s.get('number') == pin_num),
            f"Station {pin_num}"
        )

        result_list.append({
            "pin_number": pin_num,
            "station_name": station_name,
            "hourly_usage": total_arr
        })

    return result_list
# GŁÓWNA FUNKCJA (API)


def calculate_total_metro_usage(pins):
    """
    Główna funkcja wywoływana z views.py.
    """
    if not pins:
        return {}

    print(f"\n--- ROZPOCZYNAM OBLICZENIA DLA {len(pins)} PUNKTÓW ---")

    # 1. Obliczenia z ludności
    usage_pop = calculate_usage_from_population(pins, TRAFFIC_PROFILE)

    # 2. Obliczenia z przesiadki
    usage_shift = calculate_usage_from_modal_shift(pins, REF_TRAFFIC_POINTS)

    # 3. Sumowanie wyników
    total_usage = {}

    for pin in pins:
        num = pin.get('number')

        pop_arr = usage_pop.get(num, [0] * 24)
        shift_arr = usage_shift.get(num, [0] * 24)

        # Suma wektorów
        total_arr = [int(p + s) for p, s in zip(pop_arr, shift_arr)]  # rzutowanie na int dla czytelności
        total_usage[num] = total_arr


    try:
        print_tabular_results(total_usage, pins)
    except Exception as e:
        print(f"Błąd podczas wypisywania tabeli: {e}")

    return total_usage





def print_tabular_results(results_dict, pins):
    """
    Wypisuje ładną tabelę wyników do konsoli serwera.
    Mapuje numer pinu na jego nazwę.
    """
    if not results_dict:
        print("Brak wyników do wyświetlenia.")
        return

    # Tworzymy DataFrame z wyników
    df_results = pd.DataFrame.from_dict(results_dict, orient='index')

    # Nazywamy kolumny godzinami
    df_results.columns = [f"{h}:00" for h in range(24)]

    # Tworzymy mapę: Numer Pinu -> Nazwa Pinu (z danych wejściowych)
    pin_names = {p.get('number'): p.get('name', f"Pin {p.get('number')}") for p in pins}

    # Zmieniamy indeks tabeli na czytelny
    df_results.index = df_results.index.map(lambda x: f"{x}: {pin_names.get(x, 'Unknown')}")

    # Sortujemy po numerze (indeksie)
    df_results.sort_index(inplace=True)

    # Wypisujemy
    print("\n" + "=" * 100)
    print(f"TABELA WYNIKOWA: Pasażerowie na godzinę ({len(results_dict)} stacji)")
    print("=" * 100)

    # Ustawiamy opcje pandas, żeby nie ucinało kolumn w konsoli
    with pd.option_context('display.max_rows', None, 'display.max_columns', None, 'display.width', 1000):
        print(df_results)

    print("=" * 100 + "\n")
# Test lokalny
if __name__ == "__main__":
    # Symulacja danych wejściowych
    test_pins = [
        {'number': 1, 'lat': 50.0647, 'lng': 19.9450, 'name': 'Centrum'},  # Okolice Rynku
        {'number': 2, 'lat': 50.0810, 'lng': 19.8960, 'name': 'Bronowice'}  # Bronowice
    ]

    print("Testowanie kalkulatora...")
    wyniki = calculate_total_metro_usage(test_pins)

    for k, v in wyniki.items():
        print(f"Stacja {k}: Suma dobowa = {sum(v)}")
        print(f"   Godziny szczytu (7-9): {v[7:10]}")