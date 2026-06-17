from unittest.mock import patch

import numpy as np
from django.test import SimpleTestCase

from core.calculator import (
    METRO_CHOICE_BUS_AND_TRAM,
    METRO_CHOICE_BUS_ONLY,
    METRO_CHOICE_NO_SURFACE_PT,
    METRO_CHOICE_TRAM_ONLY,
    calculate_usage_from_population,
    get_metro_choice_coefficient,
    haversine_distance,
)


class GetMetroChoiceCoefficientTests(SimpleTestCase):
    def test_bus_and_tram(self):
        self.assertEqual(get_metro_choice_coefficient(1, 1), METRO_CHOICE_BUS_AND_TRAM)

    def test_bus_only(self):
        self.assertEqual(get_metro_choice_coefficient(1, 0), METRO_CHOICE_BUS_ONLY)

    def test_tram_only(self):
        self.assertEqual(get_metro_choice_coefficient(0, 1), METRO_CHOICE_TRAM_ONLY)

    def test_no_surface_pt(self):
        self.assertEqual(get_metro_choice_coefficient(0, 0), METRO_CHOICE_NO_SURFACE_PT)

    def test_competition_lowers_metro_share(self):
        no_alternatives = get_metro_choice_coefficient(0, 0)
        with_both = get_metro_choice_coefficient(1, 1)
        self.assertGreater(no_alternatives, with_both)


class HaversineDistanceTests(SimpleTestCase):
    def test_same_point_is_zero(self):
        self.assertAlmostEqual(haversine_distance(50.0, 19.0, 50.0, 19.0), 0.0)

    def test_known_distance_krakow_points(self):
        dist_km = haversine_distance(50.0647, 19.9450, 50.0810, 19.8960)
        self.assertAlmostEqual(dist_km, 3.94, delta=0.1)


class CalculateUsageFromPopulationTests(SimpleTestCase):
    PIN = {"number": 1, "lat": 50.0647, "lng": 19.9450}
    UNIFORM_PROFILE = np.ones(24) / 24

    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_daily_demand_formula(self, mock_population, mock_bus_tram):
        mock_population.return_value = {
            1: {"pop_300m": 1000, "pop_500m": 1000, "pop_800m": 1000},
        }
        mock_bus_tram.return_value = {1: {"has_bus": 0, "has_tram": 0}}

        result = calculate_usage_from_population([self.PIN], self.UNIFORM_PROFILE)

        expected_daily = 1000 * 1.7 * 0.58 * 0.60
        self.assertEqual(len(result[1]), 24)
        self.assertAlmostEqual(sum(result[1]), expected_daily, delta=24)

    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_metro_choice_reduces_demand(self, mock_population, mock_bus_tram):
        mock_population.return_value = {
            1: {"pop_300m": 1000, "pop_500m": 1000, "pop_800m": 1000},
        }

        mock_bus_tram.return_value = {1: {"has_bus": 0, "has_tram": 0}}
        without_competition = sum(
            calculate_usage_from_population([self.PIN], self.UNIFORM_PROFILE)[1]
        )

        mock_bus_tram.return_value = {1: {"has_bus": 1, "has_tram": 1}}
        with_competition = sum(
            calculate_usage_from_population([self.PIN], self.UNIFORM_PROFILE)[1]
        )

        self.assertGreater(without_competition, with_competition)
        self.assertAlmostEqual(
            without_competition / with_competition,
            METRO_CHOICE_NO_SURFACE_PT / METRO_CHOICE_BUS_AND_TRAM,
            delta=0.05,
        )

    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins")
    def test_population_rings_weighted(self, mock_population, mock_bus_tram):
        mock_population.return_value = {
            1: {"pop_300m": 100, "pop_500m": 200, "pop_800m": 400},
        }
        mock_bus_tram.return_value = {1: {"has_bus": 0, "has_tram": 0}}

        result = calculate_usage_from_population([self.PIN], self.UNIFORM_PROFILE)

        expected_daily = 270 * 1.7 * 0.58 * 0.60
        self.assertAlmostEqual(sum(result[1]), expected_daily, delta=24)

    @patch("core.calculator.calculate_bus_tram_for_pins")
    @patch("core.calculator.calculate_population_for_pins", return_value={})
    def test_uses_pin_population_fallback(self, mock_population, mock_bus_tram):
        mock_bus_tram.return_value = {1: {"has_bus": 0, "has_tram": 0}}
        pin = {**self.PIN, "pop_300m": 500, "pop_500m": 500, "pop_800m": 500}

        result = calculate_usage_from_population([pin], self.UNIFORM_PROFILE)

        expected_daily = 500 * 1.7 * 0.58 * 0.60
        self.assertAlmostEqual(sum(result[1]), expected_daily, delta=24)
