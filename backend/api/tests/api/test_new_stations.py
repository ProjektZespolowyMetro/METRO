from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from api.views import CalculateNewStationsUsageView


class NewStationsEndpointTests(APITestCase):
    URL = "/api/calculate-new-stations/"

    EXISTING = [
        {"number": 1, "name": "Central", "lat": 50.0647, "lng": 19.9450},
        {"number": 2, "name": "North", "lat": 50.0810, "lng": 19.8960},
    ]

    NEW_STATIONS = [
        {"number": 3, "name": "East", "lat": 50.0700, "lng": 19.9600},
        {"number": 4, "name": "West", "lat": 50.0600, "lng": 19.9300},
        {"number": 5, "name": "South", "lat": 50.0550, "lng": 19.9450},
    ]

    MOCK_HOURLY = list(range(24))

    @patch.object(
        CalculateNewStationsUsageView,
        "generate_hourly_usage_for_station",
        return_value=MOCK_HOURLY,
    )
    def test_post_new_stations_success(self, mock_generate):
        response = self.client.post(
            self.URL,
            {
                "existing_stations": self.EXISTING,
                "new_stations": self.NEW_STATIONS,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usage = response.data["new_stations_usage"]

        self.assertEqual(len(usage), 3)
        self.assertEqual(mock_generate.call_count, 3)

        for i, station in enumerate(self.NEW_STATIONS):
            self.assertEqual(usage[i]["pin_number"], station["number"])
            self.assertEqual(usage[i]["station_name"], station["name"])
            self.assertEqual(usage[i]["hourly_usage"], self.MOCK_HOURLY)

    def test_post_existing_stations_invalid_type(self):
        response = self.client.post(
            self.URL,
            {"existing_stations": "invalid", "new_stations": self.NEW_STATIONS},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "existing_stations must be a list")

    def test_post_new_stations_invalid_type(self):
        response = self.client.post(
            self.URL,
            {"existing_stations": self.EXISTING, "new_stations": "invalid"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "new_stations must be a list")

    def test_post_new_stations_wrong_count(self):
        response = self.client.post(
            self.URL,
            {
                "existing_stations": self.EXISTING,
                "new_stations": self.NEW_STATIONS[:2],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["error"],
            "new_stations must contain exactly 3 stations",
        )

    @patch.object(
        CalculateNewStationsUsageView,
        "generate_hourly_usage_for_station",
        return_value=MOCK_HOURLY,
    )
    def test_post_new_stations_default_name(self, mock_generate):
        stations_without_names = [
            {"number": 3, "lat": 50.07, "lng": 19.96},
            {"number": 4, "lat": 50.06, "lng": 19.93},
            {"number": 5, "lat": 50.05, "lng": 19.94},
        ]

        response = self.client.post(
            self.URL,
            {
                "existing_stations": [],
                "new_stations": stations_without_names,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["new_stations_usage"][0]["station_name"], "Station 3")
