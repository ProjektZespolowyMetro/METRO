import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

# --- KONFIGURACJA ---
PLIK_GPKG = 'kontur.gpkg'
KOLUMNA_LUDNOSC = 'population'
PROMIENIE = [300, 500, 800]
TARGET_CRS = "EPSG:2180"  # Polski układ metryczny (PUWG 1992)

# 1. Wczytywanie Excela
print("1. Wczytywanie stacji z Excela...")
df = pd.read_excel('metroCoordinates.xlsx')

lista_stacji = []
for index, row in df.iterrows():
    stacja = {
        'nazwa': row['Nazwa'],
        'coords': (row['N'], row['E'])
    }
    lista_stacji.append(stacja)

# 2. Tworzymy GeoDataFrame stacji (WGS84 - stopnie)
stacje_gdf = gpd.GeoDataFrame(
    lista_stacji,
    geometry=[Point(s['coords'][1], s['coords'][0]) for s in lista_stacji], # X=Lon, Y=Lat
    crs="EPSG:4326"
)

print(f"   Załadowano {len(stacje_gdf)} stacji.")

# 3. PRZYGOTOWANIE FILTRA (BBOX)
print("2. Analiza układu współrzędnych pliku Kontur...")

# Trik: Wczytujemy tylko 1 wiersz, żeby sprawdzić, jaki CRS ma plik gpkg
meta_info = gpd.read_file(PLIK_GPKG, rows=1)
kontur_crs = meta_info.crs
print(f"   Plik Kontur jest w układzie: {kontur_crs}")

# Konwertujemy stacje "na chwilę" do układu pliku Kontur, żeby BBOX pasował
stacje_temp = stacje_gdf.to_crs(kontur_crs)

# Obliczamy granice + margines (np. 2000 metrów zapasu z każdej strony)
minx, miny, maxx, maxy = stacje_temp.total_bounds
margines = 2000  # 2km, bo układ Kontur to zazwyczaj metry (EPSG:3857)
bbox_krakow = (minx - margines, miny - margines, maxx + margines, maxy + margines)

print(f"3. Wczytywanie danych Kontur (filtrowanie obszarem)...")
try:
    hex_gdf = gpd.read_file(PLIK_GPKG, bbox=bbox_krakow)
except Exception as e:
    print(f"BŁĄD: {e}")
    exit()

if hex_gdf.empty:
    print("UWAGA: Nie znaleziono danych! BBOX minął się z danymi.")
    exit()
else:
    print(f"   -> Sukces! Wczytano {len(hex_gdf)} heksagonów.")

# 4. UNIFIKACJA UKŁADÓW (Wszystko do EPSG:2180)
# To jest kluczowe dla poprawności obliczeń powierzchni i buforów
print("4. Transformacja danych do układu PL-1992 (EPSG:2180)...")
stacje_gdf = stacje_gdf.to_crs(TARGET_CRS)
hex_gdf = hex_gdf.to_crs(TARGET_CRS)

# Obliczamy pełną powierzchnię heksagonów (teraz w metrach kwadratowych)
hex_gdf['area_full'] = hex_gdf.geometry.area

# Przygotowanie tabeli wynikowej
wyniki = pd.DataFrame(stacje_gdf[['nazwa']])

# 5. GŁÓWNA PĘTLA OBLICZENIOWA
for promien in PROMIENIE:
    print(f"   Liczenie ludności dla promienia {promien}m...")

    # Tworzymy bufory (koła)
    bufory = stacje_gdf.copy()
    bufory['geometry'] = bufory.geometry.buffer(promien)

    # INTERSEKCJA
    # GeoPandas sam dopilnuje, żeby łączyć tylko pasujące geometrię,
    # bo wcześniej zrobiliśmy to_crs na obu plikach.
    przeciecie = gpd.overlay(bufory, hex_gdf, how='intersection')

    # Interpolacja Arealna
    przeciecie['ludnosc_fragmentu'] = (
            (przeciecie.geometry.area / przeciecie['area_full']) * przeciecie[KOLUMNA_LUDNOSC]
    )

    # Sumowanie
    suma = przeciecie.groupby('nazwa')['ludnosc_fragmentu'].sum().reset_index()
    suma.rename(columns={'ludnosc_fragmentu': f'pop_{promien}m'}, inplace=True)

    # Łączenie
    wyniki = wyniki.merge(suma, on='nazwa', how='left')

# Formatowanie
wyniki = wyniki.fillna(0).round(0)

# 6. WYNIK
print("\n--- OBLICZONE SZACOWANIE LUDNOŚCI ---")
print(wyniki.head())

plik_wynikowy = "metro_krakow_z_ludnoscia.xlsx"
wyniki.to_excel(plik_wynikowy, index=False)
print(f"\nZapisano wyniki do pliku: {plik_wynikowy}")