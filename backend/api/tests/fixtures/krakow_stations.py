"""
Dane testowe: stacje metra w Krakowie przy ruchliwych skrzyżowaniach.

Współrzędne i wolumeny ruchu pochodzą z pliku
``data/współrzędne 26 pkt metra.csv`` (punkty pomiarowe ZTP).
Populacja w mockach jest szacunkowa — do późniejszej kalibracji z kontur.gpkg.
"""

# Godzinowe wolumeny samochodów [0:00–23:00] — kolumny z CSV
_HOUR_5_MATECZNEGO = [
    3229, 1853, 1177, 801, 850, 1418, 4608, 8874, 10662, 9961,
    10039, 10127, 10271, 10441, 10369, 10505, 10583, 10475, 9861, 9950,
    10017, 9244, 7646, 5550,
]
_HOUR_1_MICKIEWICZA = [
    1659, 999, 625, 424, 467, 760, 2215, 4425, 5629, 5695,
    5537, 5392, 5465, 5488, 5572, 5631, 5647, 5432, 5299, 5282,
    5242, 4567, 3811, 2789,
]
_HOUR_9_WIELICKA = [
    4294, 2671, 1848, 1370, 1593, 2182, 5867, 12026, 14949, 14644,
    14764, 14867, 15093, 15128, 15127, 15625, 15834, 15653, 15378, 15022,
    14230, 12248, 9454, 6982,
]
_HOUR_24_MOGILSKA = [
    1749, 1186, 835, 644, 557, 617, 1260, 2504, 3875, 4587,
    4918, 5469, 5925, 6451, 6647, 6829, 6794, 6573, 6399, 6198,
    5349, 4027, 3130, 2345,
]
_HOUR_4_BELINY = [
    138, 83, 56, 39, 34, 58, 255, 759, 1288, 1381,
    1353, 1118, 1128, 1115, 1098, 1155, 1258, 1234, 1130, 1050,
    841, 572, 384, 267,
]


def _traffic_record(
    traffic_id,
    name,
    lat,
    lng,
    capacity,
    hourly_volumes,
):
    record = {
        "ID": traffic_id,
        "Nazwa": name,
        "N": lat,
        "E": lng,
        "przepustowość": capacity,
    }
    for hour, volume in enumerate(hourly_volumes):
        record[str(hour)] = volume
    return record


TRAFFIC_INTERSECTIONS = {
    "matecznego": _traffic_record(
        5,
        "Konopnickiej – Kamieńskiego – Kalwaryjska – Wadowicka (rondo Matecznego)",
        50.036401341789336,
        19.940668585556317,
        "8 909",
        _HOUR_5_MATECZNEGO,
    ),
    "mickiewicza": _traffic_record(
        1,
        "al. Mickiewicza – Piłsudskiego – Focha",
        50.05934344093985,
        19.92503696847241,
        "5355",
        _HOUR_1_MICKIEWICZA,
    ),
    "wielicka": _traffic_record(
        9,
        "Wielicka – Powstańców Wielkopolskich – Powstańców Śląskich – Limanowskiego",
        50.041916860484015,
        19.96131732181708,
        "9 145",
        _HOUR_9_WIELICKA,
    ),
    "mogilska": _traffic_record(
        24,
        "Mogilska – Lema – al. Jana Pawła II – Meissnera",
        50.071401153625175,
        19.983327552151852,
        "9 639",
        _HOUR_24_MOGILSKA,
    ),
    "beliny": _traffic_record(
        4,
        "Beliny-Prażmowskiego – Brodowicza",
        50.068038277569215,
        19.95948448149819,
        "2 477",
        _HOUR_4_BELINY,
    ),
}


def metro_station(
    number,
    key,
    *,
    pop_300m,
    pop_500m,
    pop_800m,
    has_bus=1,
    has_tram=1,
):
    """Buduje pin stacji metra przy wskazanym skrzyżowaniu."""
    intersection = TRAFFIC_INTERSECTIONS[key]
    short_name = intersection["Nazwa"].split(" (")[0].split(" – ")[0]
    return {
        "number": number,
        "name": f"Metro: {short_name}",
        "lat": intersection["N"],
        "lng": intersection["E"],
        "traffic_key": key,
        "pop_300m": pop_300m,
        "pop_500m": pop_500m,
        "pop_800m": pop_800m,
        "has_bus": has_bus,
        "has_tram": has_tram,
    }


# Propozycja odcinka metra: centrum → wschód → południe (3 stacje)
KRAKOW_METRO_LINE = [
    metro_station(
        1, "mickiewicza",
        pop_300m=12_000, pop_500m=22_000, pop_800m=35_000,
        has_bus=1, has_tram=1,
    ),
    metro_station(
        2, "mogilska",
        pop_300m=8_500, pop_500m=16_000, pop_800m=26_000,
        has_bus=1, has_tram=1,
    ),
    metro_station(
        3, "matecznego",
        pop_300m=10_000, pop_500m=18_500, pop_800m=29_000,
        has_bus=1, has_tram=0,
    ),
]

# Pojedyncze stacje do porównań (najbardziej vs najmniej ruchliwe)
KRAKOW_BUSY_STATION = metro_station(
    10, "wielicka",
    pop_300m=9_500, pop_500m=17_000, pop_800m=28_000,
)
KRAKOW_QUIET_STATION = metro_station(
    11, "beliny",
    pop_300m=3_000, pop_500m=5_500, pop_800m=9_000,
    has_bus=1, has_tram=0,
)


def population_mock(stations):
    return {
        s["number"]: {
            "pop_300m": s["pop_300m"],
            "pop_500m": s["pop_500m"],
            "pop_800m": s["pop_800m"],
        }
        for s in stations
    }


def bus_tram_mock(stations):
    return {
        s["number"]: {
            "has_bus": s.get("has_bus", 0),
            "has_tram": s.get("has_tram", 0),
        }
        for s in stations
    }


def traffic_dataframe(keys=None):
    """DataFrame punktów pomiarowych dla wybranych skrzyżowań."""
    import pandas as pd

    if keys is None:
        keys = TRAFFIC_INTERSECTIONS.keys()
    rows = [TRAFFIC_INTERSECTIONS[k] for k in keys]
    return pd.DataFrame(rows)


# Wartości referencyjne do późniejszej weryfikacji eksperckiej (obecny model + dane CSV).
# Po zmianie logiki kalkulatora — zaktualizuj świadomie (patrz test_calculator_krakow.py).
REFERENCE_MODAL_SHIFT_DAILY = {
    "wielicka": 6_609,
    "mickiewicza": 2_697,
    "matecznego": 4_565,
    "beliny": 422,
}
REFERENCE_TOTAL_DAILY = {
    1: 10_406,   # Mickiewicza
    2: 7_827,    # Mogilska
    3: 14_841,   # Matecznego
}
REFERENCE_POPULATION_DAILY = {
    # profil równomierny (sumy dobowe), ludność z mocków linii metra
    1: 6_360,   # Mickiewicza — eff_pop≈25850, metro_choice=0.25
    2: 4_680,   # Mogilska — eff_pop≈19000, metro_choice=0.25
    3: 7_416,   # Matecznego — eff_pop≈21525, metro_choice=0.35 (tylko autobus)
}

# Widełki stosunku przesiadka/ludność po kalibracji (0.65 × 0.60 + strefy Rynku)
CALIBRATED_SHIFT_TO_POP_RATIO = {
    "mickiewicza": (0.55, 0.75),
    "mogilska": (0.55, 0.75),
    "matecznego": (0.85, 1.15),
}

# Oczekiwane współczynniki na linii testowej
CALIBRATED_METRO_CHOICE = {
    "mickiewicza": 0.25,  # bus + tram
    "mogilska": 0.25,      # bus + tram
    "matecznego": 0.35,    # bus only
}

CALIBRATED_CENTER_GRAVITY = {
    "mickiewicza": 1.00,   # strefa rdzenia (<2 km od Rynku)
    "mogilska": 0.88,      # centrum szerokie (2–4 km)
    "matecznego": 0.88,    # centrum szerokie (2–4 km)
}
