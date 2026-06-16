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
_HOUR_12_ARMII_KRAJOWEJ = [
    1504, 771, 535, 540, 599, 1035, 2913, 6414, 9516, 10085,
    8692, 8252, 8136, 8367, 8854, 10006, 11348, 11402, 10956, 9759,
    8563, 6643, 5035, 2914,
]
_HOUR_14_PIASTOWSKA = [
    1380, 751, 494, 399, 434, 717, 1977, 4366, 5909, 6178,
    5459, 5186, 5122, 5184, 5410, 5814, 6366, 6209, 6198, 5626,
    5241, 4419, 3454, 2383,
]
_HOUR_20_STELLA = [
    2615, 1461, 902, 694, 832, 1590, 5107, 9817, 11456, 10951,
    10837, 10767, 11092, 11287, 11587, 12262, 13584, 13002, 12441, 12056,
    11430, 9288, 7078, 4685,
]
_HOUR_21_LISTOPADA = [
    1409, 907, 573, 413, 446, 700, 1958, 3751, 4507, 4562,
    4569, 4565, 4726, 4682, 4689, 4963, 5005, 4766, 4903, 4760,
    4673, 3986, 3093, 2295,
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
    "armii_krajowej": _traffic_record(
        12,
        "Armii Krajowej – Zarzecze",
        50.075784942948644,
        19.88854377140792,
        "9 113",
        _HOUR_12_ARMII_KRAJOWEJ,
    ),
    "piastowska": _traffic_record(
        14,
        "Piastowska – Armii Krajowej – Nawojki",
        50.070056864563824,
        19.90398157257015,
        "8 986",
        _HOUR_14_PIASTOWSKA,
    ),
    "stella_sawickiego": _traffic_record(
        20,
        "Stella-Sawickiego – Wiślicka – al. Bora-Komorowskiego",
        50.08769816524363,
        20.00136705741837,
        "9296",
        _HOUR_20_STELLA,
    ),
    "listopada": _traffic_record(
        21,
        "al. 29 Listopada – Opolska – Lublańska",
        50.08614757092223,
        19.954695217179623,
        "8 443",
        _HOUR_21_LISTOPADA,
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

# Nowa trasa: zachód → centrum → wschód (4 stacje, inna niż KRAKOW_METRO_LINE)
KRAKOW_METRO_LINE_WEST_EAST = [
    metro_station(
        101, "armii_krajowej",
        pop_300m=6_500, pop_500m=12_000, pop_800m=20_000,
        has_bus=1, has_tram=1,
    ),
    metro_station(
        102, "piastowska",
        pop_300m=7_800, pop_500m=14_500, pop_800m=23_000,
        has_bus=1, has_tram=1,
    ),
    metro_station(
        103, "mickiewicza",
        pop_300m=12_000, pop_500m=22_000, pop_800m=35_000,
        has_bus=1, has_tram=1,
    ),
    metro_station(
        104, "stella_sawickiego",
        pop_300m=9_000, pop_500m=16_500, pop_800m=27_000,
        has_bus=1, has_tram=0,
    ),
]


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


def usage_breakdown(stations, traffic_df, profile):
    """
    Zwraca dzienne sumy: ludność, przesiadka, razem — z mockami i podanym profilem.
    """
    from unittest.mock import patch

    from core.calculator import (
        calculate_usage_from_modal_shift,
        calculate_usage_from_population,
    )

    with patch(
        "core.calculator.calculate_population_for_pins",
        return_value=population_mock(stations),
    ), patch(
        "core.calculator.calculate_bus_tram_for_pins",
        return_value=bus_tram_mock(stations),
    ):
        pop = calculate_usage_from_population(stations, profile)
        shift = calculate_usage_from_modal_shift(stations, traffic_df)

    breakdown = {}
    for station in stations:
        num = station["number"]
        pop_daily = sum(pop[num])
        shift_daily = sum(shift[num])
        breakdown[num] = {
            "name": station["name"],
            "traffic_key": station["traffic_key"],
            "pop_daily": pop_daily,
            "shift_daily": shift_daily,
            "total_daily": pop_daily + shift_daily,
        }
    return breakdown


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

# Trasa zachód–wschód (KRAKOW_METRO_LINE_WEST_EAST) — baseline po kalibracji 0.65/0.60
REFERENCE_WEST_EAST_LINE = {
    101: {"pop": 3_562, "shift": 3_253, "total": 6_815, "metro_choice": 0.25, "gravity": 0.88},
    102: {"pop": 4_176, "shift": 2_076, "total": 6_252, "metro_choice": 0.25, "gravity": 0.88},
    103: {"pop": 6_359, "shift": 5_129, "total": 11_488, "metro_choice": 0.25, "gravity": 1.00},
    104: {"pop": 6_796, "shift": 7_891, "total": 14_687, "metro_choice": 0.35, "gravity": 0.72},
}
