import math

from core.calculator import calculate_total_metro_usage
from django.http import HttpResponse
from django.views import View
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

# STAŁE BUDOWY METRA
METRO_TUNNEL_COST_PER_KM = 238.21  # mln USD za km tunelu
METRO_STATION_COST = 80  # mln USD za stację

# STAŁE UTRZYMANIA METRA DZIENNIE
METRO_DAILY_MAINTENANCE_5MIN = 10000  # USD za dzień (kursy co 5 minut)
METRO_DAILY_MAINTENANCE_10MIN = 20000  # USD za dzień (kursy co 10 minut)


class ReceivePinsView(APIView):
    """
    Receives pins from frontend, prints them,
    calculates distances between consecutive pins
    """

    # haversine might be overkill but found available code xd
    def haversine(self, lat1, lon1, lat2, lon2):
        """
        Calculate distance between two points in meters
        https://en.wikipedia.org/wiki/Haversine_formula
        """
        R = 6371000  # Earth radius in meters

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = (
            math.sin(dphi / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        )

        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def calculate_metro_construction_costs(self, total_length_meters, num_stations):
        """
        Oblicza całkowite koszty budowy metra.

        Args:
            total_length_meters: Całkowita długość tunelu w metrach
            num_stations: Liczba stacji (zwykle = liczba pinów)

        Returns:
            Słownik z kosztami budowy w mln USD
        """
        # Konwersja metrów na km
        total_length_km = total_length_meters / 1000

        # Koszty tunelu
        tunnel_cost = total_length_km * METRO_TUNNEL_COST_PER_KM

        # Koszty stacji
        stations_cost = num_stations * METRO_STATION_COST

        # Całkowity koszt budowy
        total_cost = tunnel_cost + stations_cost

        return {
            "tunnel_length_km": round(total_length_km, 2),
            "tunnel_cost_millions_usd": round(tunnel_cost, 2),
            "num_stations": num_stations,
            "stations_cost_millions_usd": round(stations_cost, 2),
            "total_construction_cost_millions_usd": round(total_cost, 2),
            "total_construction_cost_billion_usd": round(total_cost / 1000, 3),
        }

    def calculate_metro_maintenance_costs(self, frequency_minutes=5):
        """
        Oblicza dzienny koszt utrzymania linii metra w zależności od częstotliwości kursów.

        Args:
            frequency_minutes:  Częstotliwość kursów w minutach (5 lub 10)

        Returns:
            Słownik z kosztami utrzymania (dziennie, miesięcznie, rocznie)
        """
        if frequency_minutes == 5:
            daily_cost = METRO_DAILY_MAINTENANCE_5MIN
            frequency_label = "co 5 minut"
        elif frequency_minutes == 10:
            daily_cost = METRO_DAILY_MAINTENANCE_10MIN
            frequency_label = "co 10 minut"
        else:
            # Interpolacja dla innych częstotliwości (opcjonalnie)
            daily_cost = METRO_DAILY_MAINTENANCE_5MIN
            frequency_label = f"co {frequency_minutes} minut"

        # Obliczenia
        monthly_cost = daily_cost * 30
        yearly_cost = daily_cost * 365

        return {
            "frequency_minutes": frequency_minutes,
            "frequency_label": frequency_label,
            "daily_cost_usd": daily_cost,
            "monthly_cost_usd": round(monthly_cost, 2),
            "yearly_cost_usd": round(yearly_cost, 2),
        }

    def post(self, request):
        pins = request.data.get("pins", [])
        train_frequency = request.data.get("train_frequency", 5)  # Pobiera z frontend
        maintenance_costs = self.calculate_metro_maintenance_costs(
            frequency_minutes=train_frequency
        )

        if not isinstance(pins, list):
            return Response(
                {"error": "pins must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # sort by pin number
        pins.sort(key=lambda p: p["number"])

        print("Received pins:")
        for p in pins:
            print(p)

        segments = []
        total_length = 0.0

        print("Segments:")

        for i in range(len(pins) - 1):
            p1 = pins[i]
            p2 = pins[i + 1]

            length = self.haversine(
                p1["lat"],
                p1["lng"],
                p2["lat"],
                p2["lng"],
            )

            segments.append(
                {
                    "from": p1["number"],
                    "to": p2["number"],
                    "length_meters": round(length, 2),
                }
            )

            total_length += length

        print(segments)
        print("Total length:", total_length)

        # Mateusz, do sth about it
        metro_usage_results = {}

        try:
            print(" call calc total_metro_usage ")
            # metro_usage_results = calculate_total_metro_usage(pins)
        except Exception as e:
            print(f"calculator error {e}")
            metro_usage_results = {"error": str(e)}
        construction_costs = self.calculate_metro_construction_costs(
            total_length_meters=total_length, num_stations=len(pins)
        )
        print(f"Construction costs: {construction_costs}")

        maintenance_costs = self.calculate_metro_maintenance_costs(
            frequency_minutes=train_frequency
        )
        print(f"Maintenance costs: {maintenance_costs}")

        return Response(
            {
                "pins": pins,
                "segments": segments,
                "total_length_meters": round(total_length, 2),
                # "metro_usage": metro_usage_results, # to leci do przerobienia jako osobna funkcja
                "construction_costs": construction_costs,  # to jest szybkie, ale jak sądzisz że lepiej to przeniesc do fronta to smialo
                "maintenance_costs": maintenance_costs,  # tak jak powyżej
            },
            status=status.HTTP_200_OK,
        )


class CalculateNewStationsUsageView(APIView):
    """
    Bierze listę istniejących przystanków oraz 3 nowe przystanki,
    wykonuje obliczenia dla nowych przystanków i zwraca ich użycie metra.
    """

    def generate_hourly_usage_for_station(self, new_station, existing_stations):
        """
        Mock: Oblicza użycie metra dla nowego przystanku na podstawie
        istniejących przystanków i położenia nowego przystanku.

        Args:
            new_station: Nowy przystanek (dict z number, name, lat, lng)
            existing_stations: Lista istniejących przystanków

        Returns:
            Lista z 24 elementami (liczba pasażerów dla każdej godziny)
        """
        import random

        # Mock obliczenia - można tu wstawić rzeczywiste logiki
        # Na podstawie odległości od istniejących przystanków, gęstości zabudowy itp.

        # Bazowe użycie (będzie się różnić w zależności od pozycji przystanku)
        base_usage = [
            100,  # 0:00
            50,  # 1:00
            40,  # 2:00
            80,  # 3:00
            200,  # 4:00
            800,  # 5:00
            1500,  # 6:00
            2000,  # 7:00
            1800,  # 8:00
            1200,  # 9:00
            1100,  # 10:00
            1300,  # 11:00
            1400,  # 12:00
            1350,  # 13:00
            1200,  # 14:00
            1100,  # 15:00
            1300,  # 16:00
            1800,  # 17:00
            1900,  # 18:00
            1400,  # 19:00
            900,  # 20:00
            500,  # 21:00
            250,  # 22:00
            150,  # 23:00
        ]

        # Mnożnik na podstawie liczby istniejących przystanków
        # (więcej przystanków = nowy przystanek będzie mniej obciążony)
        proximity_multiplier = 1.0 - (len(existing_stations) * 0.05)
        proximity_multiplier = max(0.5, proximity_multiplier)  # min 50%

        # Losowa zmienność ±20%
        hourly_usage = [
            int(usage * proximity_multiplier * (0.8 + random.random() * 0.4))
            for usage in base_usage
        ]

        return hourly_usage

    def post(self, request):
        """
        POST: /api/calculate-new-stations/

        Request body:
        {
            "existing_stations": [
                {"number": 1, "name": "Central Station", "lat": 52.1, "lng": 21.0},
                {"number": 2, "name": "North Station", "lat": 52.2, "lng": 21.1}
            ],
            "new_stations": [
                {"number": 3, "name": "East Station", "lat": 52.15, "lng": 21.15},
                {"number": 4, "name": "West Station", "lat": 52.05, "lng": 20.95},
                {"number": 5, "name": "South Station", "lat": 52.0, "lng": 21.05}
            ]
        }

        Response:
        {
            "new_stations_usage": [
                {
                    "pin_number": 3,
                    "station_name": "East Station",
                    "hourly_usage": [100, 50, 40, ...] (24 elementy)
                },
                {
                    "pin_number": 4,
                    "station_name": "West Station",
                    "hourly_usage": [95, 48, 38, ...] (24 elementy)
                },
                {
                    "pin_number": 5,
                    "station_name": "South Station",
                    "hourly_usage": [102, 52, 41, ...] (24 elementy)
                }
            ]
        }
        """
        existing_stations = request.data.get("existing_stations", [])
        new_stations = request.data.get("new_stations", [])

        # Validacja
        if not isinstance(existing_stations, list):
            return Response(
                {"error": "existing_stations must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(new_stations, list):
            return Response(
                {"error": "new_stations must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_stations) != 3:
            return Response(
                {"error": "new_stations must contain exactly 3 stations"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        print(f"Obliczanie użycia dla 3 nowych przystanków...")
        print(f"Istniejące przystanki: {len(existing_stations)}")
        print(f"Nowe przystanki: {len(new_stations)}")

        new_stations_usage = []

        for new_station in new_stations:
            # Tutaj można wstawić rzeczywiste obliczenia
            # zamiast mock'ów - np. calculate_total_metro_usage()
            station_usage = {
                "pin_number": new_station.get("number"),
                "station_name": new_station.get(
                    "name", f"Station {new_station.get('number')}"
                ),
                "hourly_usage": self.generate_hourly_usage_for_station(
                    new_station, existing_stations
                ),
            }
            new_stations_usage.append(station_usage)

        return Response(
            {"new_stations_usage": new_stations_usage},
            status=status.HTTP_200_OK,
        )
