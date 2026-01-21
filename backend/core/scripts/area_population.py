import os
import pandas as pd
import geopandas as gpd
from django.conf import settings

# Stałe
PLIK_GPKG = os.path.join(settings.BASE_DIR, 'kontur.gpkg')
PROMIENIE = [300, 500, 800]
TARGET_CRS = "EPSG:2180"


def calculate_population_for_pins(pins_list):
    """
    Logika biznesowa: Przyjmuje listę pinów, zwraca słownik z ludnością.
    """
    if not os.path.exists(PLIK_GPKG):
        print(f"BŁĄD: Brak pliku {PLIK_GPKG}")
        return {}

    try:
        # 1. Konwersja do GeoDataFrame
        df = pd.DataFrame(pins_list)
        stacje_gdf = gpd.GeoDataFrame(
            df,
            geometry=gpd.points_from_xy(df['lng'], df['lat']),
            crs="EPSG:4326"
        )

        # 2. BBOX (Optymalizacja)
        meta = gpd.read_file(PLIK_GPKG, rows=1)
        stacje_temp = stacje_gdf.to_crs(meta.crs)
        minx, miny, maxx, maxy = stacje_temp.total_bounds
        margines = 2000
        bbox = (minx - margines, miny - margines, maxx + margines, maxy + margines)

        # 3. Wczytanie danych
        hex_gdf = gpd.read_file(PLIK_GPKG, bbox=bbox)
        if hex_gdf.empty:
            return {}

        # 4. Obliczenia
        stacje_gdf = stacje_gdf.to_crs(TARGET_CRS)
        hex_gdf = hex_gdf.to_crs(TARGET_CRS)
        hex_gdf['area_full'] = hex_gdf.geometry.area

        # Zakładamy, że kolumna z populacją nazywa się 'population' lub bierzemy pierwszą
        col_pop = 'population' if 'population' in hex_gdf.columns else hex_gdf.columns[0]

        wyniki_pop = {row['number']: {} for _, row in df.iterrows()}

        for promien in PROMIENIE:
            bufory = stacje_gdf.copy()
            bufory['geometry'] = bufory.geometry.buffer(promien)

            przeciecie = gpd.overlay(bufory, hex_gdf, how='intersection')

            przeciecie['lud_frag'] = (
                    (przeciecie.geometry.area / przeciecie['area_full']) * przeciecie[col_pop]
            )

            suma = przeciecie.groupby('number')['lud_frag'].sum()

            for numer, wartosc in suma.items():
                wyniki_pop[numer][f'pop_{promien}m'] = int(round(wartosc))

        return wyniki_pop

    except Exception as e:
        print(f"Błąd w obliczeniach GIS: {e}")
        return {}