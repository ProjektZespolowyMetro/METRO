from django.http import HttpResponse
from django.views import View
import math
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from core.calculator import calculate_total_metro_usage

class HelloWorldView(View):
    def get(self, request):
        return HttpResponse("Hello world!")


#STAŁE BUDOWY METRA
METRO_TUNNEL_COST_PER_KM = 238.21  # mln USD za km tunelu
METRO_STATION_COST = 80             # mln USD za stację

#STAŁE UTRZYMANIA METRA DZIENNIE
METRO_DAILY_MAINTENANCE_5MIN = 10000    # USD za dzień (kursy co 5 minut)
METRO_DAILY_MAINTENANCE_10MIN = 20000   # USD za dzień (kursy co 10 minut)

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
            + math.cos(phi1)
            * math.cos(phi2)
            * math.sin(dlambda / 2) ** 2
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
            "total_construction_cost_billion_usd": round(total_cost / 1000, 3)
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
            "yearly_cost_usd": round(yearly_cost, 2)
        }

    def post(self, request):
        pins = request.data.get("pins", [])
        train_frequency = request.data.get("train_frequency", 5)  # Pobiera z frontend
        maintenance_costs = self.calculate_metro_maintenance_costs(frequency_minutes=train_frequency)

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
                p1["lat"], p1["lng"],
                p2["lat"], p2["lng"],
            )

            segments.append({
                "from": p1["number"],
                "to": p2["number"],
                "length_meters": round(length, 2),
            })

            total_length += length

        print(segments)
        print("Total length:", total_length)

        #Mateusz, do sth about it
        metro_usage_results = {}

        try:
            print(" call calc total_metro_usage ")
            # it will print data to console
            metro_usage_results = calculate_total_metro_usage(pins)
        except Exception as e:
            print(f"calculator error {e}")
            metro_usage_results = {"error": str(e)}
        construction_costs = self.calculate_metro_construction_costs(
            total_length_meters=total_length,
            num_stations=len(pins)
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
                # added metro usage below
                "metro_usage": metro_usage_results,
                "construction_costs": construction_costs,
                # ===== NOWE W RESPONSE =====
                "maintenance_costs": maintenance_costs,
            },
            status=status.HTTP_200_OK,
        )