from django.test import SimpleTestCase

from api.views import (
    METRO_DAILY_MAINTENANCE_10MIN,
    METRO_DAILY_MAINTENANCE_5MIN,
    METRO_STATION_COST,
    METRO_TUNNEL_COST_PER_KM,
    ReceivePinsView,
)


class ReceivePinsViewHaversineTests(SimpleTestCase):
    def setUp(self):
        self.view = ReceivePinsView()

    def test_same_point_is_zero(self):
        self.assertAlmostEqual(
            self.view.haversine(50.0, 19.0, 50.0, 19.0),
            0.0,
        )

    def test_returns_meters_not_kilometers(self):
        dist_m = self.view.haversine(50.0647, 19.9450, 50.0810, 19.8960)
        self.assertAlmostEqual(dist_m, 3939, delta=50)


class ReceivePinsViewConstructionCostsTests(SimpleTestCase):
    def setUp(self):
        self.view = ReceivePinsView()

    def test_construction_costs(self):
        costs = self.view.calculate_metro_construction_costs(
            total_length_meters=10_000,
            num_stations=4,
        )

        self.assertEqual(costs["tunnel_length_km"], 10.0)
        self.assertEqual(costs["num_stations"], 4)
        self.assertEqual(costs["tunnel_cost_millions_usd"], 10.0 * METRO_TUNNEL_COST_PER_KM)
        self.assertEqual(costs["stations_cost_millions_usd"], 4 * METRO_STATION_COST)
        self.assertEqual(
            costs["total_construction_cost_millions_usd"],
            costs["tunnel_cost_millions_usd"] + costs["stations_cost_millions_usd"],
        )


class ReceivePinsViewMaintenanceCostsTests(SimpleTestCase):
    def setUp(self):
        self.view = ReceivePinsView()

    def test_maintenance_5_minutes(self):
        costs = self.view.calculate_metro_maintenance_costs(frequency_minutes=5)
        self.assertEqual(costs["daily_cost_usd"], METRO_DAILY_MAINTENANCE_5MIN)
        self.assertEqual(costs["monthly_cost_usd"], METRO_DAILY_MAINTENANCE_5MIN * 30)
        self.assertEqual(costs["yearly_cost_usd"], METRO_DAILY_MAINTENANCE_5MIN * 365)

    def test_maintenance_10_minutes(self):
        costs = self.view.calculate_metro_maintenance_costs(frequency_minutes=10)
        self.assertEqual(costs["daily_cost_usd"], METRO_DAILY_MAINTENANCE_10MIN)
