from contextlib import nullcontext
from pathlib import Path

import pandas as pd

def calculate(metroPoints: list) -> list:
    metroUsageFromIntersections = calculateFromIntersection(metroPoints)
    metroUsageToIntersections = calculateFromPopulation(metroPoints)
    finalList: list = []

    for element in metroUsageFromIntersections:
        sumPoint = calculateFromIntersection(element) + calculateFromPopulation(element)
        finalList.append(sumPoint)
    print(finalList)
    return finalList

def calculateFromIntersection(metroPoints: list) -> list:
    current_dir = Path(__file__).resolve().parent
    path_to_csv = current_dir.parent.parent / 'data' / 'ludnosc_wokolo_punktow.csv'
    populationData = getPopulationData(str(path_to_csv), metroPoints)

    return nullcontext

def calculateFromPopulation(metroPoints: list) -> list:

    return nullcontext


def getPopulationData(path, listID):
    ridePerPerson = 1.85 #data from docs from prof. Kucharski
    usage0_300 = 0.95
    usage300_500 = 0.8
    usage500_800 = 0.475

    df = pd.read_csv(path)
    df = df.set_index('ID')

    df = df.reindex(listID)

    strefa_0_300 = df['pop_300m']

    strefa_300_500 = df['pop_500m'] - df['pop_300m']

    strefa_500_800 = df['pop_800m'] - df['pop_500m']

    wynik_df = pd.DataFrame({
        '0_300m': strefa_0_300 * usage0_300,
        '300_500m': strefa_300_500 * usage300_500,
        '500_800m': strefa_500_800 * usage500_800
    })
    wynik_df = wynik_df * ridePerPerson
    wynik_df = wynik_df.fillna(0).astype(int)

    return wynik_df.reset_index().values.tolist()


def znajdz_sciezke_do_csv(nazwa_pliku: str) -> str:

    current_path = Path(__file__).resolve()
    temp_path = current_path.parent

    # Przeszukujemy do 5 folderów w górę
    for _ in range(5):
        sprawdzana_sciezka = temp_path / 'data' / nazwa_pliku
        if sprawdzana_sciezka.exists():
            return str(sprawdzana_sciezka)

        # Idziemy piętro wyżej
        if temp_path.parent == temp_path:  # Osiągnięto root dysku
            break
        temp_path = temp_path.parent

    # Jeśli pętla się skończy i nic nie znajdzie:
    raise FileNotFoundError(f"Nie znaleziono pliku '{nazwa_pliku}' w folderze 'data' w strukturze projektu.")

if __name__ == "__main__":
    from pathlib import Path
    import os

    # 1. Startujemy od lokalizacji tego pliku (calculator.py)
    current_path = Path(__file__).resolve()
    print(f"Startuję poszukiwania z: {current_path}")

    znaleziony_plik = None

    # 2. Pętla idąca w górę katalogów (sprawdzamy 5 poziomów w górę)
    # Szukamy folderu 'data' i pliku w nim
    temp_path = current_path.parent
    for i in range(5):
        sprawdzana_sciezka = temp_path / 'data' / 'ludnosc_wokolo_punktow.csv'

        # Debug: pokazuje gdzie skrypt akurat patrzy
        # print(f"Sprawdzam: {sprawdzana_sciezka}")

        if sprawdzana_sciezka.exists():
            znaleziony_plik = str(sprawdzana_sciezka)
            print(f"\n✅ SUKCES! Znaleziono plik: {znaleziony_plik}")
            break

        # Idziemy piętro wyżej
        temp_path = temp_path.parent
        # Zabezpieczenie przed wyjściem poza dysk
        if temp_path == temp_path.parent:
            break

    # 3. Uruchomienie funkcji lub raport błędu
    if znaleziony_plik:
        testowe_id = [1, 5, 26]
        try:
            wynik = getPopulationData(znaleziony_plik, testowe_id)
            print("\n--- WYNIKI OBLICZEŃ ---")
            for wiersz in wynik:
                print(wiersz)
        except Exception as e:
            print(f"Błąd podczas obliczeń: {e}")
    else:
        print("\n❌ NIE ZNALEZIONO PLIKU.")
        print("Skrypt przeszukał foldery w górę, ale nie znalazł 'data/ludnosc_wokolo_punktow.csv'.")
        print("Wypisuję zawartość folderów nadrzędnych, żebyś zobaczył strukturę:")

        debug_path = current_path.parent
        for i in range(3):
            print(f"\nFolder: {debug_path}")
            try:
                pliki = os.listdir(debug_path)
                print(f"Zawartość: {pliki}")
            except:
                print("Brak dostępu.")
            debug_path = debug_path.parent