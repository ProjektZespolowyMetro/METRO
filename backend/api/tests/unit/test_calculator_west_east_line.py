
from unittest.mock import patch

import numpy as np
from django.test import SimpleTestCase

from api.tests.fixtures.krakow_stations import (
    KRAKOW_METRO_LINE_WEST_EAST,
    REFERENCE_WEST_EAST_LINE,
    TRAFFIC_INTERSECTIONS,
    bus_tram_mock,
    population_mock,
    traffic_dataframe,
    usage_breakdown,
)
from core.calculator import (
    METRO_CHOICE_BUS_AND_TRAM,
    METRO_CHOICE_BUS_ONLY,
    TRAFFIC_PROFILE,
    calculate_total_metro_usage,
    find_nearest_traffic_point,
    get_center_gravity_coefficient,
    get_metro_choice_coefficient,
)


class WestEastLineCalibrationTests(SimpleTestCase):

    def setUp(self):
        self.stations = KRAKOW_METRO_LINE_WEST_EAST
        self.traffic_df = traffic_dataframe()
        self.profile = TRAFFIC_PROFILE if TRAFFIC_PROFILE is not None else np.ones(24) / 24
        self.breakdown = usage_breakdown(self.stations, self.traffic_df, self.profile)

    def test_stations_map_to_expected_intersections(self):
        expected_ids = {
            101: TRAFFIC_INTERSECTIONS["armii_krajowej"]["ID"],
            102: TRAFFIC_INTERSECTIONS["piastowska"]["ID"],
            103: TRAFFIC_INTERSECTIONS["mickiewicza"]["ID"],
            104: TRAFFIC_INTERSECTIONS["stella_sawickiego"]["ID"],
        }
        for station in self.stations:
            nearest = find_nearest_traffic_point(
                station["lat"], station["lng"], self.traffic_df,
            )
            self.assertEqual(int(nearest["ID"]), expected_ids[station["number"]])

    def test_metro_choice_coefficients_on_line(self):
        for station in self.stations:
            num = station["number"]
            expected_mc = REFERENCE_WEST_EAST_LINE[num]["metro_choice"]
            actual_mc = get_metro_choice_coefficient(station["has_bus"], station["has_tram"])
            self.assertEqual(actual_mc, expected_mc)
            if station["has_bus"] and station["has_tram"]:
                self.assertEqual(actual_mc, METRO_CHOICE_BUS_AND_TRAM)
            elif station["has_bus"]:
                self.assertEqual(actual_mc, METRO_CHOICE_BUS_ONLY)

    def test_center_gravity_zones_on_line(self):
        for station in self.stations:
            num = station["number"]
            expected_g = REFERENCE_WEST_EAST_LINE[num]["gravity"]
            actual_g = get_center_gravity_coefficient(station["lat"], station["lng"])
            self.assertEqual(actual_g, expected_g)

        mickiewicza = get_center_gravity_coefficient(
            self.stations[2]["lat"], self.stations[2]["lng"],
        )
        stella = get_center_gravity_coefficient(
            self.stations[3]["lat"], self.stations[3]["lng"],
        )
        self.assertGreater(mickiewicza, stella)

    def test_calibrated_daily_totals_match_baseline(self):
        for station in self.stations:
            num = station["number"]
            ref = REFERENCE_WEST_EAST_LINE[num]
            row = self.breakdown[num]
            self.assertAlmostEqual(row["pop_daily"], ref["pop"], delta=ref["pop"] * 0.05)
            self.assertAlmostEqual(row["shift_daily"], ref["shift"], delta=ref["shift"] * 0.05)
            self.assertAlmostEqual(row["total_daily"], ref["total"], delta=ref["total"] * 0.05)

    def test_shift_to_population_ratio_in_calibrated_band(self):
        for station in self.stations:
            row = self.breakdown[station["number"]]
            ratio = row["shift_daily"] / row["pop_daily"]
            self.assertGreaterEqual(ratio, 0.40, msg=station["name"])
            self.assertLessEqual(ratio, 1.30, msg=station["name"])

    def test_central_station_leads_non_central_on_total(self):
        totals = {s["number"]: self.breakdown[s["number"]]["total_daily"] for s in self.stations}
        self.assertGreater(totals[103], totals[102])
        self.assertGreater(totals[103], totals[101])

    def test_busiest_east_end_has_highest_total(self):
        totals = [self.breakdown[s["number"]]["total_daily"] for s in self.stations]
        self.assertEqual(max(totals), self.breakdown[104]["total_daily"])

    @patch("builtins.print")
    @patch("core.calculator.print_tabular_results")
    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_total_metro_usage_matches_breakdown(
        self, mock_population, mock_bus_tram, _mock_print, _mock_stdout,
    ):
        mock_population.return_value = population_mock(self.stations)
        mock_bus_tram.return_value = bus_tram_mock(self.stations)

        with patch("core.calculator.REF_TRAFFIC_POINTS", self.traffic_df):
            total = calculate_total_metro_usage(self.stations)

        for station in self.stations:
            num = station["number"]
            self.assertAlmostEqual(
                sum(total[num]),
                self.breakdown[num]["total_daily"],
                delta=30,
            )
