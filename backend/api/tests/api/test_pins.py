from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from api.views import METRO_DAILY_MAINTENANCE_10MIN, METRO_STATION_COST, METRO_TUNNEL_COST_PER_KM


class PinsEndpointTests(APITestCase):
    URL = "/api/pins/"

    PINS_TWO = [
        {"number": 1, "lat": 50.0647, "lng": 19.9450, "name": "Centrum"},
        {"number": 2, "lat": 50.0810, "lng": 19.8960, "name": "Bronowice"},
    ]

    def setUp(self):
        super().setUp()
        self._print_patcher = patch("builtins.print")
        self._print_patcher.start()

    def tearDown(self):
        self._print_patcher.stop()
        super().tearDown()

    def test_post_pins_success(self):
        response = self.client.post(
            self.URL,
            {"pins": self.PINS_TWO, "train_frequency": 5},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(len(data["pins"]), 2)
        self.assertEqual(len(data["segments"]), 1)
        self.assertEqual(data["segments"][0]["from"], 1)
        self.assertEqual(data["segments"][0]["to"], 2)
        self.assertAlmostEqual(data["total_length_meters"], 3939, delta=50)
        self.assertIn("construction_costs", data)
        self.assertIn("maintenance_costs", data)

    def test_post_pins_invalid_pins_type(self):
        response = self.client.post(
            self.URL,
            {"pins": "not-a-list"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "pins must be a list")

    def test_post_pins_sorts_by_number(self):
        unsorted_pins = [
            {"number": 3, "lat": 50.0810, "lng": 19.8960},
            {"number": 1, "lat": 50.0647, "lng": 19.9450},
            {"number": 2, "lat": 50.0700, "lng": 19.9200},
        ]

        response = self.client.post(
            self.URL,
            {"pins": unsorted_pins},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [p["number"] for p in response.data["pins"]],
            [1, 2, 3],
        )

    def test_post_pins_single_pin_no_segments(self):
        response = self.client.post(
            self.URL,
            {"pins": [{"number": 1, "lat": 50.0647, "lng": 19.9450}]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["segments"], [])
        self.assertEqual(response.data["total_length_meters"], 0)
        self.assertEqual(response.data["construction_costs"]["num_stations"], 1)
        self.assertEqual(
            response.data["construction_costs"]["stations_cost_millions_usd"],
            METRO_STATION_COST,
        )

    def test_post_pins_train_frequency_10(self):
        response = self.client.post(
            self.URL,
            {"pins": self.PINS_TWO, "train_frequency": 10},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["maintenance_costs"]["daily_cost_usd"],
            METRO_DAILY_MAINTENANCE_10MIN,
        )

    def test_post_pins_construction_costs_match_length(self):
        response = self.client.post(
            self.URL,
            {"pins": self.PINS_TWO},
            format="json",
        )

        costs = response.data["construction_costs"]
        length_km = response.data["total_length_meters"] / 1000

        self.assertAlmostEqual(costs["tunnel_length_km"], length_km, places=2)
        self.assertAlmostEqual(
            costs["tunnel_cost_millions_usd"],
            length_km * METRO_TUNNEL_COST_PER_KM,
            places=1,
        )
