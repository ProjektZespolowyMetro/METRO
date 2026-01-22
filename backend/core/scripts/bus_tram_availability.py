import math
from core.BusTramHandler import BusTramHandler
from core.DataProvider import JsonFileProvider
from core.SearchStrategy import BruteForceSearch


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


def calculate_bus_tram_for_pins(pins_list, stations_file='data/stations.geojson', radius_m=500):
    """
    Sprawdza dostępność autobusów i tramwajów dla każdego pinu w promieniu radius_m metrów.

    Args:
        pins_list: Lista pinów z polami 'number', 'lat', 'lng'
        stations_file: Ścieżka do pliku GeoJSON z przystankami
        radius_m:  Promień wyszukiwania w metrach (default 500m)

    Returns:
        Słownik:  {pin_number: {'has_bus': 0/1, 'has_tram': 0/1, 'metro_choice': 0.xx}}
    """
    results = {}

    try:
        # 1. Inicjalizuj handler przystanków
        data_provider = JsonFileProvider(stations_file)
        search_engine = BruteForceSearch()
        handler = BusTramHandler(data_provider, search_engine)
        handler.initialize()

        radius_km = radius_m / 1000  # Konwersja metrów na km

        # 2. Dla każdego pinu sprawdzaj przystanek
        for pin in pins_list:
            pin_number = pin.get('number')
            lat = pin.get('lat')
            lng = pin.get('lng')

            # Szukaj autobusów w promieniu
            bus_station, bus_dist = handler.find_closest_station(lat, lng, label={"bus"})

            # Szukaj tramwajów w promieniu
            tram_station, tram_dist = handler.find_closest_station(lat, lng, label={"tram"})

            # Konwersja stopni na km (przybliżenie:  1 stopień ≈ 111 km)
            bus_dist_km = bus_dist * 111 if bus_station else float('inf')
            tram_dist_km = tram_dist * 111 if tram_station else float('inf')

            # Sprawdzenie czy przystanek jest w promieniu
            has_bus = 1 if bus_dist_km <= radius_km else 0
            has_tram = 1 if tram_dist_km <= radius_km else 0

            # Ustalenie współczynnika metro_choice
            if has_bus == 1 and has_tram == 1:
                metro_choice = 0.25
                print(f"Pin {pin_number} [{lat}, {lng}] ✓ BUS + TRAM -> metro_choice = 0.25")
            elif has_bus == 1 and has_tram == 0:
                metro_choice = 0.35
                print(f"Pin {pin_number} [{lat}, {lng}] ✓ BUS -> metro_choice = 0.35")
            elif has_bus == 0 and has_tram == 1:
                metro_choice = 0.30
                print(f"Pin {pin_number} [{lat}, {lng}] ✓ TRAM -> metro_choice = 0.30")
            else:
                metro_choice = 0.60
                print(f"Pin {pin_number} [{lat}, {lng}] ✗ BRAK BUS/TRAM -> metro_choice = 0.60")

            # Zapisz wynik
            results[pin_number] = {
                'has_bus': has_bus,
                'has_tram': has_tram,
                'metro_choice': metro_choice,
                'bus_dist': round(bus_dist_km, 3) if bus_station else None,
                'tram_dist': round(tram_dist_km, 3) if tram_station else None
            }

    except Exception as e:
        print(f"BŁĄD w calculate_bus_tram_for_pins: {e}")
        # Zwróć domyślne wartości dla wszystkich pinów
        for pin in pins_list:
            pin_number = pin.get('number')
            results[pin_number] = {
                'has_bus': 0,
                'has_tram': 0,
                'metro_choice': 0.60
            }

    return results