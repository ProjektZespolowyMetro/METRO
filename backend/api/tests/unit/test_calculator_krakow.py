from unittest.mock import patch

import numpy as np
import pandas as pd
from django.test import SimpleTestCase

from api.tests.fixtures.krakow_stations import (
    KRAKOW_BUSY_STATION,
    KRAKOW_METRO_LINE,
    KRAKOW_QUIET_STATION,
    REFERENCE_MODAL_SHIFT_DAILY,
    REFERENCE_POPULATION_DAILY,
    REFERENCE_TOTAL_DAILY,
    TRAFFIC_INTERSECTIONS,
    bus_tram_mock,
    population_mock,
    traffic_dataframe,
)
from core.calculator import (
    CENTER_GRAVITY_ZONES,
    KRAKOW_CENTER_LAT,
    KRAKOW_CENTER_LNG,
    TRAFFIC_PROFILE,
    calculate_total_metro_usage,
    calculate_usage_from_modal_shift,
    calculate_usage_from_population,
    find_nearest_traffic_point,
    get_center_gravity_coefficient,
    get_metro_choice_coefficient,
)


class KrakowCenterGravityTests(SimpleTestCase):
    """Strefy premii bliskości Rynku Głównego."""

    def test_rynek_is_highest_zone(self):
        coeff = get_center_gravity_coefficient(KRAKOW_CENTER_LAT, KRAKOW_CENTER_LNG)
        self.assertEqual(coeff, CENTER_GRAVITY_ZONES[0][1])

    def test_mickiewicza_closer_than_wielicka(self):
        mick = get_center_gravity_coefficient(
            KRAKOW_METRO_LINE[0]["lat"], KRAKOW_METRO_LINE[0]["lng"],
        )
        wiel = get_center_gravity_coefficient(
            KRAKOW_BUSY_STATION["lat"], KRAKOW_BUSY_STATION["lng"],
        )
        self.assertGreaterEqual(mick, wiel)

    def test_zones_decrease_with_distance(self):
        near = get_center_gravity_coefficient(50.062, 19.938)   # ~0.2 km od Rynku
        mid = get_center_gravity_coefficient(50.05, 19.90)      # ~3 km
        far = get_center_gravity_coefficient(50.01, 19.85)      # ~8 km
        self.assertGreater(near, mid)
        self.assertGreater(mid, far)


class KrakowTrafficMappingTests(SimpleTestCase):
    """Stacja metra powinna mapować się na właściwe skrzyżowanie pomiarowe."""

    def setUp(self):
        self.traffic_df = traffic_dataframe()

    def test_mickiewicza_maps_to_central_intersection(self):
        station = KRAKOW_METRO_LINE[0]
        nearest = find_nearest_traffic_point(station["lat"], station["lng"], self.traffic_df)
        self.assertEqual(int(nearest["ID"]), TRAFFIC_INTERSECTIONS["mickiewicza"]["ID"])

    def test_wielicka_maps_to_busiest_intersection(self):
        station = KRAKOW_BUSY_STATION
        nearest = find_nearest_traffic_point(station["lat"], station["lng"], self.traffic_df)
        self.assertEqual(int(nearest["ID"]), TRAFFIC_INTERSECTIONS["wielicka"]["ID"])

    def test_matecznego_maps_to_southern_hub(self):
        station = KRAKOW_METRO_LINE[2]
        nearest = find_nearest_traffic_point(station["lat"], station["lng"], self.traffic_df)
        self.assertEqual(int(nearest["ID"]), TRAFFIC_INTERSECTIONS["matecznego"]["ID"])


class KrakowModalShiftTests(SimpleTestCase):
    """Przesiadka z aut (modal shift) przy ruchliwych skrzyżowaniach Krakowa."""

    def setUp(self):
        self.traffic_df = traffic_dataframe()

    def _daily_shift(self, station):
        result = calculate_usage_from_modal_shift([station], self.traffic_df)
        return sum(result[station["number"]])

    def test_peak_hour_exceeds_night_at_mickiewicza(self):
        station = KRAKOW_METRO_LINE[0]
        hourly = calculate_usage_from_modal_shift([station], self.traffic_df)[station["number"]]
        self.assertGreater(hourly[8], hourly[2])
        self.assertGreater(hourly[17], hourly[3])

    def test_busy_intersection_exceeds_quiet_one(self):
        busy_shift = self._daily_shift(KRAKOW_BUSY_STATION)
        quiet_shift = self._daily_shift(KRAKOW_QUIET_STATION)
        self.assertGreater(busy_shift, quiet_shift * 5)

    def test_metro_line_all_stations_have_positive_shift(self):
        results = calculate_usage_from_modal_shift(KRAKOW_METRO_LINE, self.traffic_df)
        for station in KRAKOW_METRO_LINE:
            daily = sum(results[station["number"]])
            self.assertGreater(daily, 0, msg=f"Stacja {station['name']} powinna mieć przesiadkę > 0")

    def test_line_segment_uses_neighbor_distance(self):
        """Środkowa stacja linii korzysta z odległości do sąsiada, nie domyślnych 2 km."""
        single = calculate_usage_from_modal_shift([KRAKOW_METRO_LINE[1]], self.traffic_df)
        on_line = calculate_usage_from_modal_shift(KRAKOW_METRO_LINE, self.traffic_df)
        single_daily = sum(single[KRAKOW_METRO_LINE[1]["number"]])
        line_daily = sum(on_line[KRAKOW_METRO_LINE[1]["number"]])
        self.assertNotEqual(single_daily, line_daily)

    @patch("builtins.print")
    @patch("core.calculator.print_tabular_results")
    def test_reference_modal_shift_wielicka(self, _mock_print, _mock_stdout):
        """Baseline do weryfikacji — najruchliwsze skrzyżowanie w zestawie."""
        daily = self._daily_shift(KRAKOW_BUSY_STATION)
        ref = REFERENCE_MODAL_SHIFT_DAILY["wielicka"]
        self.assertAlmostEqual(daily, ref, delta=ref * 0.15)

    def test_reference_modal_shift_ordering(self):
        """Względna kolejność przesiadki: Wielicka > Matecznego > Mickiewicza > Beliny."""
        shifts = {
            "wielicka": self._daily_shift(KRAKOW_BUSY_STATION),
            "matecznego": self._daily_shift(KRAKOW_METRO_LINE[2]),
            "mickiewicza": self._daily_shift(KRAKOW_METRO_LINE[0]),
            "beliny": self._daily_shift(KRAKOW_QUIET_STATION),
        }
        self.assertGreater(shifts["wielicka"], shifts["matecznego"])
        self.assertGreater(shifts["matecznego"], shifts["mickiewicza"])
        self.assertGreater(shifts["mickiewicza"], shifts["beliny"])


class KrakowPopulationMockTests(SimpleTestCase):
    """Popyt z ludności — mocki populacji i PT dla stacji krakowskich."""

    def setUp(self):
        self.profile = TRAFFIC_PROFILE if TRAFFIC_PROFILE is not None else np.ones(24) / 24

    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_krakow_line_population_demand(self, mock_population, mock_bus_tram):
        mock_population.return_value = population_mock(KRAKOW_METRO_LINE)
        mock_bus_tram.return_value = bus_tram_mock(KRAKOW_METRO_LINE)

        results = calculate_usage_from_population(KRAKOW_METRO_LINE, self.profile)

        for station in KRAKOW_METRO_LINE:
            daily = sum(results[station["number"]])
            self.assertGreater(daily, 0)
            self.assertEqual(len(results[station["number"]]), 24)

    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_matecznego_higher_metro_share_than_mogilska(self, mock_population, mock_bus_tram):
        """Matecznego: tylko autobus → wyższy metro_choice niż Mogilska (bus+tram)."""
        mock_population.return_value = population_mock(KRAKOW_METRO_LINE)
        mock_bus_tram.return_value = bus_tram_mock(KRAKOW_METRO_LINE)

        results = calculate_usage_from_population(KRAKOW_METRO_LINE, np.ones(24) / 24)

        matecznego = KRAKOW_METRO_LINE[2]
        mogilska = KRAKOW_METRO_LINE[1]

        def effective_population(station):
            p300 = station["pop_300m"]
            p500 = station["pop_500m"]
            p800 = station["pop_800m"]
            ring_300_500 = max(0, p500 - p300)
            ring_500_800 = max(0, p800 - p500)
            return p300 + ring_300_500 * 0.80 + ring_500_800 * 0.45

        daily_m = sum(results[matecznego["number"]])
        daily_g = sum(results[mogilska["number"]])

        coeff_m = get_metro_choice_coefficient(matecznego["has_bus"], matecznego["has_tram"])
        coeff_g = get_metro_choice_coefficient(mogilska["has_bus"], mogilska["has_tram"])
        self.assertGreater(coeff_m, coeff_g)

        expected_ratio = (effective_population(matecznego) * coeff_m) / (
            effective_population(mogilska) * coeff_g
        )
        self.assertAlmostEqual(daily_m / daily_g, expected_ratio, delta=0.02)

    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_peak_hours_follow_traffic_profile(self, mock_population, mock_bus_tram):
        mock_population.return_value = population_mock([KRAKOW_METRO_LINE[0]])
        mock_bus_tram.return_value = bus_tram_mock([KRAKOW_METRO_LINE[0]])

        results = calculate_usage_from_population([KRAKOW_METRO_LINE[0]], self.profile)
        hourly = results[KRAKOW_METRO_LINE[0]["number"]]

        morning_peak = sum(hourly[7:10])
        night = sum(hourly[1:4])
        self.assertGreater(morning_peak, night)

    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_reference_population_daily_mickiewicza(self, mock_population, mock_bus_tram):
        mock_population.return_value = population_mock(KRAKOW_METRO_LINE)
        mock_bus_tram.return_value = bus_tram_mock(KRAKOW_METRO_LINE)

        results = calculate_usage_from_population(KRAKOW_METRO_LINE, np.ones(24) / 24)
        daily = sum(results[1])
        ref = REFERENCE_POPULATION_DAILY[1]
        self.assertAlmostEqual(daily, ref, delta=ref * 0.05)


class KrakowTotalMetroUsageTests(SimpleTestCase):
    """Pełny kalkulator: ludność (mock) + przesiadka (dane CSV skrzyżowań)."""

    @patch("builtins.print")
    @patch("core.calculator.print_tabular_results")
    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_total_usage_combines_both_components(
        self, mock_population, mock_bus_tram, _mock_print, _mock_stdout,
    ):
        mock_population.return_value = population_mock(KRAKOW_METRO_LINE)
        mock_bus_tram.return_value = bus_tram_mock(KRAKOW_METRO_LINE)

        traffic_df = traffic_dataframe()
        with patch("core.calculator.REF_TRAFFIC_POINTS", traffic_df):
            total = calculate_total_metro_usage(KRAKOW_METRO_LINE)

        pop_only = calculate_usage_from_population(
            KRAKOW_METRO_LINE,
            TRAFFIC_PROFILE,
        )
        shift_only = calculate_usage_from_modal_shift(KRAKOW_METRO_LINE, traffic_df)

        for station in KRAKOW_METRO_LINE:
            num = station["number"]
            expected = [
                int(p + s)
                for p, s in zip(pop_only[num], shift_only[num])
            ]
            self.assertEqual(total[num], expected)

    @patch("builtins.print")
    @patch("core.calculator.print_tabular_results")
    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_total_daily_mickiewicza_exceeds_mogilska(
        self, mock_population, mock_bus_tram, _mock_print, _mock_stdout,
    ):
        """Centrum (Mickiewicza) powinno mieć wyższy łączny popyt niż Mogilska."""
        mock_population.return_value = population_mock(KRAKOW_METRO_LINE)
        mock_bus_tram.return_value = bus_tram_mock(KRAKOW_METRO_LINE)
        traffic_df = traffic_dataframe()

        with patch("core.calculator.REF_TRAFFIC_POINTS", traffic_df):
            total = calculate_total_metro_usage(KRAKOW_METRO_LINE)

        self.assertGreater(sum(total[1]), sum(total[2]))

    @patch("builtins.print")
    @patch("core.calculator.print_tabular_results")
    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_reference_total_daily_line(
        self, mock_population, mock_bus_tram, _mock_print, _mock_stdout,
    ):
        mock_population.return_value = population_mock(KRAKOW_METRO_LINE)
        mock_bus_tram.return_value = bus_tram_mock(KRAKOW_METRO_LINE)
        traffic_df = traffic_dataframe()

        with patch("core.calculator.REF_TRAFFIC_POINTS", traffic_df):
            total = calculate_total_metro_usage(KRAKOW_METRO_LINE)

        for station in KRAKOW_METRO_LINE:
            num = station["number"]
            ref = REFERENCE_TOTAL_DAILY[num]
            self.assertAlmostEqual(sum(total[num]), ref, delta=ref * 0.05)

    @patch("core.calculator.print_tabular_results")
    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_returns_empty_for_no_pins(self, mock_population, mock_bus_tram, _mock_print):
        self.assertEqual(calculate_total_metro_usage([]), {})
        mock_population.assert_not_called()
        mock_bus_tram.assert_not_called()
