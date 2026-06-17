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


# współczynniki użycia przy możliwości skorzystania z innych srodkow komunikacji
METRO_CHOICE_BUS_AND_TRAM = 0.25
METRO_CHOICE_BUS_ONLY = 0.35
METRO_CHOICE_TRAM_ONLY = 0.30
METRO_CHOICE_NO_SURFACE_PT = 0.60


def get_metro_choice_coefficient(has_bus, has_tram):
    """
    Zwraca współczynnik udziału metra w popycie PT na podstawie dostępności
    przystanków autobusowych i tramwajowych w promieniu stacji.
    """
    if has_bus == 1 and has_tram == 1:
        return METRO_CHOICE_BUS_AND_TRAM
    if has_bus == 1 and has_tram == 0:
        return METRO_CHOICE_BUS_ONLY
    if has_bus == 0 and has_tram == 1:
        return METRO_CHOICE_TRAM_ONLY
    return METRO_CHOICE_NO_SURFACE_PT


# --- Modal shift: kalibracja przesiadki z aut + strefy bliskości centrum (Rynek) ---

KRAKOW_CENTER_LAT = 50.0616
KRAKOW_CENTER_LNG = 19.9373

# Strefy odległości od Rynku Głównego → mnożnik popytu przesiadkowego
CENTER_GRAVITY_ZONES = (
    (2.0, 1.00),   # 0–2 km: rdzeń (Stare Miasto, Kazimierz)
    (4.0, 0.88),   # 2–4 km: centrum szerokie
    (7.0, 0.72),   # 4–7 km: pierścień środkowy
    (float("inf"), 0.58),  # 7+ km: peryferie
)

# Premia centrum dla ludności (hotele, turystyka, pracownicy dojeżdżający)
CENTER_GRAVITY_POPULATION_ZONES = (
    (1.5, 2.62),   # ścisłe centrum (było 3.50, −25%)
    (3.0, 1.80),   # centrum wewnętrzne (było 2.40)
    (5.0, 1.31),   # centrum szerokie (było 1.75)
    (8.0, 1.00),   # pierścień środkowy (było 1.30)
    (float("inf"), 1.00),
)

MODAL_SHIFT_ADDRESSABLE_SHARE = 0.65   # ułamek ruchu aut adresowalny dla metra
MODAL_SHIFT_CAPTURE_RATE = 1.20        # podwojona frakcja przesiadki (było 0.60)
BPR_SATURATION_CAP = 1.0               # limit nasycenia w funkcji BPR
BPR_ALPHA = 0.15
BPR_BETA = 2


def get_center_gravity_coefficient(lat, lng):
    """
    Zwraca mnożnik popytu przesiadkowego wg odległości stacji od Rynku Głównego.
    Im bliżej centrum, tym wyższy współczynnik.
    """
    return _center_gravity_from_zones(lat, lng, CENTER_GRAVITY_ZONES)


def get_center_gravity_population_coefficient(lat, lng):
    """
    Zwraca mnożnik popytu z ludności wg odległości od Rynku (hotele, praca, turystyka).
    W ścisłym centrum do ×2.62.
    """
    return _center_gravity_from_zones(lat, lng, CENTER_GRAVITY_POPULATION_ZONES)


def _center_gravity_from_zones(lat, lng, zones):
    dist_km = haversine_distance(lat, lng, KRAKOW_CENTER_LAT, KRAKOW_CENTER_LNG)
    for max_dist_km, coefficient in zones:
        if dist_km <= max_dist_km:
            return coefficient
    return zones[-1][1]






def calculate_usage_from_population(pins, profile):
    """
    Oblicza potoki pasażerskie na podstawie ludności wokół pinezek.
    """
    # _, df_pop, traffic_profile, _, _ = DATA# sprawdzic

    results = {}

    # Stałe z oryginalnego skryptu
    W_300 = 1.00
    W_500 = 0.80
    W_800 = 0.45
    MOBILITY_RATE = 1.7
    PUT_SHARE = 0.58

    # Wywołujemy skrypt area_population, aby uzupełnić dane o ludności
    # (chyba że piny już mają te dane - wtedy to tylko aktualizacja)
    if calculate_population_for_pins:
        pop_data = calculate_population_for_pins(pins)
    else:
        pop_data = {}

    bus_tram_info = calculate_bus_tram_for_pins(pins)

    for pin in pins:
        pin_num = pin.get('number')

        # Pobieramy dane o ludności (z wyniku area_population lub bezpośrednio z pina)
        # Jeśli calculate_population_for_pins zadziałało, dane są w pop_data
        p_info = pop_data.get(pin_num, {})

        # Fallback: sprawdź czy pin już miał dane (np. przesłane z frontendu)
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

        pin_access = bus_tram_info.get(pin_num, {})
        has_bus = pin_access.get('has_bus', 0)
        has_tram = pin_access.get('has_tram', 0)
        metro_choice = get_metro_choice_coefficient(has_bus, has_tram)
        pop_gravity = get_center_gravity_population_coefficient(pin['lat'], pin['lng'])

        daily_demand = (
            eff_pop * MOBILITY_RATE * PUT_SHARE * metro_choice * pop_gravity
        )

        # Rozkład godzinowy
        if profile is not None:
            hourly_pax = [int(daily_demand * p) for p in profile]
        else:
            hourly_pax = [0] * 24

        results[pin_num] = hourly_pax

    return results



def calculate_usage_from_modal_shift(pins, df_traffic_points):
    """
    Oblicza przesiadkę z samochodów, znajdując najbliższy punkt pomiarowy dla każdej pinezki.
    """
    results = {}

    # Stałe modelu logitowego
    OCCUPANCY = 1.3
    AUTO_SHARE_BASELINE = 0.44
    BETA_TIME = -0.04
    METRO_BONUS = 0.5
    METRO_SPEED = 35.0  # km/h
    METRO_ACCESS = 5.0  # min

    # Sortujemy piny po numerze, żeby policzyć odległości między stacjami
    sorted_pins = sorted(pins, key=lambda x: x.get('number', 0))

    for i, pin in enumerate(sorted_pins):
        pin_num = pin.get('number')
        hourly_shift = [0] * 24
        center_gravity = get_center_gravity_coefficient(pin['lat'], pin['lng'])

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
            dist_km = 2.0  # Domyślnie

            next_pin = sorted_pins[i + 1] if i < len(sorted_pins) - 1 else None
            prev_pin = sorted_pins[i - 1] if i > 0 else None

            neighbor = next_pin if next_pin else prev_pin

            if neighbor:
                dist_km = haversine_distance(pin['lat'], pin['lng'], neighbor['lat'], neighbor['lng'])

            t_metro = (dist_km / METRO_SPEED) * 60 + METRO_ACCESS
            u_metro = (BETA_TIME * t_metro) + METRO_BONUS

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

                addressable_vol = vol_car * MODAL_SHIFT_ADDRESSABLE_SHARE
                people_in_cars_now = addressable_vol * OCCUPANCY
                total_travelers = people_in_cars_now / AUTO_SHARE_BASELINE

                saturation = min(vol_car / capacity, BPR_SATURATION_CAP)
                t_auto_cur = auto_free_min * (1 + BPR_ALPHA * (saturation ** BPR_BETA))

                u_auto = BETA_TIME * t_auto_cur

                exp_auto = np.exp(u_auto)
                exp_metro = np.exp(u_metro)

                prob_auto_new = exp_auto / (exp_auto + exp_metro)

                people_in_cars_new = total_travelers * prob_auto_new

                shift_raw = max(0, people_in_cars_now - people_in_cars_new)
                shift = int(
                    shift_raw
                    * MODAL_SHIFT_CAPTURE_RATE
                    * center_gravity
                )
                hourly_shift[h] = shift

        results[pin_num] = hourly_shift

    return results



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