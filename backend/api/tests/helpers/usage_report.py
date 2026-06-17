"""Formatuje i wypisuje wyniki kalkulatora metra do konsoli (testy / debug)."""

from unittest.mock import patch

from api.tests.fixtures.krakow_stations import (
    KRAKOW_BUSY_STATION,
    KRAKOW_METRO_LINE,
    KRAKOW_QUIET_STATION,
    bus_tram_mock,
    population_mock,
    traffic_dataframe,
)
from core.calculator import (
    TRAFFIC_PROFILE,
    calculate_usage_from_modal_shift,
    calculate_usage_from_population,
)


def compute_usage_breakdown(stations):
    """
    Liczy popyt z ludności, przesiadkę i sumę dla podanych stacji.
    Populacja i autobus/tramwaj — mocki z fixtures.
    Ruch drogowy — dane CSV skrzyżowań Krakowa.
    """
    traffic_df = traffic_dataframe()
    profile = TRAFFIC_PROFILE

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
        pop_hourly = pop.get(num, [0] * 24)
        shift_hourly = shift.get(num, [0] * 24)
        total_hourly = [p + s for p, s in zip(pop_hourly, shift_hourly)]
        breakdown[num] = {
            "name": station.get("name", f"Stacja {num}"),
            "population_hourly": pop_hourly,
            "modal_shift_hourly": shift_hourly,
            "total_hourly": total_hourly,
            "population_daily": sum(pop_hourly),
            "modal_shift_daily": sum(shift_hourly),
            "total_daily": sum(total_hourly),
        }
    return breakdown


def print_metro_usage_report(title="RAPORT UŻYCIA METRA — KRAKÓW"):
    """Wypisuje czytelny raport użycia metra na stdout."""
    sections = [
        ("Linia metra (3 stacje)", KRAKOW_METRO_LINE),
        ("Porównanie: Wielicka (najruchliwsze)", [KRAKOW_BUSY_STATION]),
        ("Porównanie: Beliny (ciche)", [KRAKOW_QUIET_STATION]),
    ]

    line = "=" * 100
    print(f"\n{line}")
    print(title)
    print(line)

    for section_title, stations in sections:
        breakdown = compute_usage_breakdown(stations)
        print(f"\n--- {section_title} ---")
        print(
            f"{'Stacja':<42} {'Ludność':>10} {'Przesiadka':>12} {'RAZEM':>10} "
            f"{'Szczyt 7-9':>14}"
        )
        print("-" * 100)

        for station in stations:
            row = breakdown[station["number"]]
            peak = sum(row["total_hourly"][7:10])
            print(
                f"{row['name']:<42} "
                f"{row['population_daily']:>10,} "
                f"{row['modal_shift_daily']:>12,} "
                f"{row['total_daily']:>10,} "
                f"{peak:>14,}"
            )

        if len(stations) == 1:
            _print_hourly_detail(breakdown[stations[0]["number"]])
        elif section_title.startswith("Linia"):
            for station in stations:
                _print_hourly_detail(breakdown[station["number"]], compact=True)

    print(f"\n{line}\n")


def _print_hourly_detail(row, compact=False):
    """Wypisuje rozkład godzinowy dla jednej stacji."""
    label = row["name"] if not compact else f"  [{row['name']}]"
    hours = row["total_hourly"]
    peak_morning = ", ".join(f"{h:02d}:00={hours[h]}" for h in range(7, 10))
    peak_evening = ", ".join(f"{h:02d}:00={hours[h]}" for h in range(16, 19))
    night = ", ".join(f"{h:02d}:00={hours[h]}" for h in range(1, 4))

    print(f"\n{label}")
    print(f"    Szczyt poranny (7–9):   {peak_morning}")
    print(f"    Szczyt wieczorny (16–18): {peak_evening}")
    print(f"    Noc (1–3):             {night}")
    if not compact:
        all_hours = "  ".join(f"{h:02d}={hours[h]}" for h in range(24))
        print(f"    Wszystkie godziny:     {all_hours}")
