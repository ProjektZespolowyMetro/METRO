import pandas as pd
import numpy as np
from pathlib import Path
import os


# ---------------------------------------------------------
# FUNKCJA POMOCNICZA: SZUKANIE PLIKÓW
# ---------------------------------------------------------
def get_file_path(filename):
    """
    Szuka pliku w bieżącym katalogu lub w folderze 'data' idąc w górę.
    """
    # 1. Sprawdź katalog bieżący (tam gdzie skrypt)
    current_dir = Path(__file__).resolve().parent
    file_path = current_dir / filename
    if file_path.exists():
        return str(file_path)

    # 2. Szukaj w górę w folderze 'data'
    search_path = current_dir
    for _ in range(5):
        candidate = search_path / 'data' / filename
        if candidate.exists():
            return str(candidate)
        if search_path.parent == search_path:
            break
        search_path = search_path.parent

    # 3. Fallback - zwróć samą nazwę (może zadziała jeśli CWD jest ustawione)
    print(f"OSTRZEŻENIE: Nie znaleziono pliku {filename}, próbuję ścieżki względnej.")
    return filename


# ---------------------------------------------------------
# KROK 1: WCZYTANIE I PRZYGOTOWANIE DANYCH
# ---------------------------------------------------------

def load_and_prep_data():
    """
    Wczytuje pliki CSV i przygotowuje struktury danych.
    Zwraca tuple 5-elementową:
    (df_stations, df_pop, traffic_profile, metro_dist_map, road_time_map)
    """

    # Definicja plików z użyciem funkcji szukającej
    files = {
        'pop': get_file_path('ludnosc_wokolo_punktow.csv'),
        'traffic_profile': get_file_path('godzinowe_natezenie_ruchu.csv'),
        'metro_lines': get_file_path('line_distance.csv'),
        'road_data': get_file_path('roads_distance_speed_output.csv'),
        'stations_traffic': get_file_path('współrzędne 26 pkt metra.csv')
    }

    try:
        df_pop = pd.read_csv(files['pop'])
        df_profile = pd.read_csv(files['traffic_profile'])
        df_lines = pd.read_csv(files['metro_lines'])
        df_roads = pd.read_csv(files['road_data'])
        df_stations = pd.read_csv(files['stations_traffic'])
    except Exception as e:
        print(f"Błąd krytyczny podczas wczytywania: {e}")
        return None

    # --- Stacje ---
    col_map = {str(i): i for i in range(24)}
    df_stations.rename(columns=col_map, inplace=True)
    df_stations['ID'] = pd.to_numeric(df_stations['ID'], errors='coerce').fillna(0).astype(int)
    df_stations.set_index('ID', inplace=True)

    # Mapa Nazwa -> ID
    name_to_id = df_stations.reset_index().set_index('Nazwa')['ID'].to_dict()

    # --- Ludność ---
    df_pop['ID'] = df_pop['nazwa'].map(name_to_id)
    df_pop = df_pop.dropna(subset=['ID'])
    df_pop['ID'] = df_pop['ID'].astype(int)
    df_pop.set_index('ID', inplace=True)

    # --- Profil Ruchu ---
    traffic_profile = df_profile.iloc[0].values
    if isinstance(traffic_profile[0], str):
        traffic_profile = [float(x.replace(',', '.')) for x in traffic_profile]
    traffic_profile = np.array(traffic_profile)
    if traffic_profile.sum() > 0:
        traffic_profile = traffic_profile / traffic_profile.sum()

    # --- Mapa Odległości METRA ---
    metro_dist_map = {}
    for _, row in df_lines.iterrows():
        n1, n2 = row['Location1'], row['Location2']
        dist = row['Distance_km']
        id1 = name_to_id.get(n1)
        id2 = name_to_id.get(n2)
        if id1 and id2:
            metro_dist_map[(id1, id2)] = dist
            metro_dist_map[(id2, id1)] = dist

    # --- Mapa Czasu AUTA ---
    road_time_map = {}
    for _, row in df_roads.iterrows():
        n1, n2 = row['Location1'], row['Location2']
        time_str = str(row['Travel_Time_hr'])
        try:
            parts = time_str.split(':')
            if len(parts) == 3:
                h, m, s = int(parts[0]), int(parts[1]), float(parts[2])
                total_minutes = (h * 60) + m + (s / 60)
            else:
                total_minutes = 5.0
        except:
            total_minutes = 5.0

        id1 = name_to_id.get(n1)
        id2 = name_to_id.get(n2)
        if id1 and id2:
            road_time_map[(id1, id2)] = total_minutes
            road_time_map[(id2, id1)] = total_minutes

    print("Dane załadowane pomyślnie.")
    print(f"- Stacje: {len(df_stations)}")
    print(f"- Połączenia metra: {len(metro_dist_map)}")
    print(f"- Połączenia drogowe: {len(road_time_map)}")

    return df_stations, df_pop, traffic_profile, metro_dist_map, road_time_map


# Ładowanie danych globalnych
DATA = load_and_prep_data()


# ---------------------------------------------------------
# KROK 2: FUNKCJA 1 - UŻYCIE NA PODSTAWIE LUDNOŚCI
# ---------------------------------------------------------

def calculate_population_usage(station_ids, overrides=None):
    """
    Oblicza liczbę pasażerów generowaną przez okoliczną ludność.
    """
    # TU BYŁ BŁĄD: Poprawione rozpakowanie 5 elementów (dodano _, _)
    _, df_pop, traffic_profile, _, _ = DATA

    results = {}

    W_300 = 1.00
    W_500 = 0.80
    W_800 = 0.45
    MOBILITY_RATE = 1.7
    PUT_SHARE = 0.58

    for sid in station_ids:
        hourly_pax = [0] * 24

        if sid in df_pop.index:
            row = df_pop.loc[sid]

            # Konkurencja transportowa
            try:
                has_bus = int(row.get('autobus', 0))
                has_tram = int(row.get('tramwaj', 0))
            except:
                has_bus = 0;
                has_tram = 0

            if has_bus == 1 and has_tram == 1:
                metro_choice = 0.25
            elif has_bus == 1 and has_tram == 0:
                metro_choice = 0.35
            elif has_bus == 0 and has_tram == 1:
                metro_choice = 0.30
            else:
                metro_choice = 0.60

            if overrides and sid in overrides:
                metro_choice = overrides[sid]

            # Populacja
            def clean_val(val):
                if pd.isnull(val): return 0.0
                if isinstance(val, str):
                    return float(val.replace(' ', '').replace(',', '.'))
                return float(val)

            p300 = clean_val(row['pop_300m'])
            p500 = clean_val(row['pop_500m'])
            p800 = clean_val(row['pop_800m'])

            ring_0_300 = p300
            ring_300_500 = max(0, p500 - p300)
            ring_500_800 = max(0, p800 - p500)

            eff_pop = (ring_0_300 * W_300) + (ring_300_500 * W_500) + (ring_500_800 * W_800)

            daily_demand = eff_pop * MOBILITY_RATE * PUT_SHARE * metro_choice
            hourly_pax = [int(daily_demand * p) for p in traffic_profile]

        results[sid] = hourly_pax

    return results


# ---------------------------------------------------------
# KROK 3: FUNKCJA 2 - PRZESIADKA Z AUT (MODAL SPLIT)
# ---------------------------------------------------------

def calculate_modal_shift(station_ids):
    # Poprawione rozpakowanie 5 elementów
    df_stations, _, _, metro_dist_map, road_time_map = DATA
    results = {}

    OCCUPANCY = 1.3
    AUTO_SHARE_BASELINE = 0.44
    BETA_TIME = -0.04
    METRO_BONUS = 0.5
    METRO_SPEED = 35.0
    METRO_ACCESS = 5.0

    def get_segment_data(curr_id, idx, id_list):
        m_dist = 2.0  # Domyślny dystans km
        a_time = 5.0  # Domyślny czas auta min

        neighbor_id = None
        if idx < len(id_list) - 1:
            neighbor_id = id_list[idx + 1]
        elif idx > 0:
            neighbor_id = id_list[idx - 1]

        if neighbor_id:
            key = (curr_id, neighbor_id)
            if key in metro_dist_map:
                m_dist = metro_dist_map[key]
            if key in road_time_map:
                a_time = road_time_map[key]

        return m_dist, a_time

    for idx, sid in enumerate(station_ids):
        hourly_shift = [0] * 24

        if sid in df_stations.index:
            row = df_stations.loc[sid]

            # Pobranie danych geograficznych
            metro_km, auto_free_min = get_segment_data(sid, idx, station_ids)

            # Przepustowość
            try:
                cap_val = str(row['przepustowosc']).replace(' ', '')
                capacity = float(cap_val)
            except:
                capacity = 3000.0

            # Użyteczność Metra (stała)
            t_metro = (metro_km / METRO_SPEED) * 60 + METRO_ACCESS
            u_metro = (BETA_TIME * t_metro) + METRO_BONUS

            for h in range(24):
                try:
                    vol_car = float(row[h])
                except:
                    vol_car = 0

                if vol_car <= 0 or capacity <= 0:
                    continue

                people_in_cars_now = vol_car * OCCUPANCY
                total_travelers_pool = people_in_cars_now / AUTO_SHARE_BASELINE

                # Czas auta w korku (BPR)
                saturation = vol_car / capacity
                t_auto_cur = auto_free_min * (1 + 0.5 * (saturation ** 4))

                u_auto = BETA_TIME * t_auto_cur

                exp_auto = np.exp(u_auto)
                exp_metro = np.exp(u_metro)
                prob_auto_new = exp_auto / (exp_auto + exp_metro)

                people_in_cars_new = total_travelers_pool * prob_auto_new
                shift = max(0, people_in_cars_now - people_in_cars_new)

                hourly_shift[h] = int(shift)

        results[sid] = hourly_shift

    return results


# ---------------------------------------------------------
# KROK 4: GŁÓWNA FUNKCJA SUMUJĄCA i WYPISUJĄCA
# ---------------------------------------------------------

def calculate_total_metro_usage(station_ids):
    if DATA is None:
        return "Błąd danych - sprawdź pliki CSV"

    usage_from_pop = calculate_population_usage(station_ids)
    usage_from_shift = calculate_modal_shift(station_ids)

    total_usage = {}
    for sid in station_ids:
        p_list = usage_from_pop.get(sid, [0] * 24)
        s_list = usage_from_shift.get(sid, [0] * 24)
        total_list = [p + s for p, s in zip(p_list, s_list)]
        total_usage[sid] = total_list

    return total_usage


def print_tabular_results(results_dict):
    if not isinstance(results_dict, dict):
        print(f"Wynik nie jest słownikiem: {results_dict}")
        return

    df_results = pd.DataFrame.from_dict(results_dict, orient='index')
    df_results.columns = [f"{h}:00" for h in range(24)]

    try:
        df_stations_info = DATA[0]
        id_to_name = df_stations_info['Nazwa'].to_dict()
        df_results.index = df_results.index.map(lambda x: f"{x}: {id_to_name.get(x, 'Stacja ' + str(x))}")
    except:
        pass

    print("\n" + "=" * 80)
    print("TABELA WYNIKOWA: Pasażerowie na godzinę")
    print("=" * 80)
    with pd.option_context('display.max_rows', None, 'display.max_columns', None, 'display.width', 1000):
        print(df_results)
    print("=" * 80 + "\n")


if __name__ == "__main__":
    # Test
    test_ids = [1, 3, 4, 5, 8, 11, 15, 17, 18, 26]
    print(f"Obliczam dla ID: {test_ids}...")

    wyniki = calculate_total_metro_usage(test_ids)

    if isinstance(wyniki, str):
        print(f"BŁĄD: {wyniki}")
    else:
        print_tabular_results(wyniki)
if __name__ == "__main__":
    # 1. Lista ID do sprawdzenia
    test_ids = [1, 3, 4, 5, 8, 11, 15, 17, 18, 26]

    print(f"Obliczam dla ID: {test_ids}...")

    # 2. Obliczenia
    wyniki = calculate_total_metro_usage(test_ids)

    # ZABEZPIECZENIE: Sprawdź, czy wyniki to słownik, czy komunikat błędu
    if isinstance(wyniki, str):
        print(f"BŁĄD KRYTYCZNY: {wyniki}")
    else:
        # 3. WYPISANIE TABELI 2D
        print_tabular_results(wyniki)

    print(f"Obliczam dla ID: {test_ids}...")

    # 2. Obliczenia
    wyniki = calculate_total_metro_usage(test_ids)

    # 3. WYPISANIE TABELI 2D
    print_tabular_results(wyniki)

    # 4. (Opcjonalnie) Jeśli potrzebujesz tej tabeli jako "surowej" listy list w Pythonie:
    raw_2d_list = [dane_stacji for dane_stacji in wyniki.values()]
    # print("Surowa lista list:", raw_2d_list)