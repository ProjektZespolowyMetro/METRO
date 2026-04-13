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
            #metro_usage_results = calculate_total_metro_usage(pins)
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
                #"metro_usage": metro_usage_results, # to leci do przerobienia jako osobna funkcja
                "construction_costs": construction_costs, # to jest szybkie, ale jak sądzisz że lepiej to przeniesc do fronta to smialo
                "maintenance_costs": maintenance_costs, # tak jak powyżej
            },
            status=status.HTTP_200_OK,
        )


from core.calculator import calculate_metro_usage_for_single_station


class CalculateNewStationsUsageView(APIView):
    """
    Bierze nowy przystanek oraz listę istniejących przystanków,
    oblicza użycie dla nowego przystanku i jego sąsiadów.
    """

    def post(self, request):
        """
        POST: /api/calculate-new-stations/

        Request body:
        {
            "new_station": {"number": 3, "name": "East Station", "lat": 52.15, "lng": 21.15},
            "existing_stations": [
                {"number": 1, "name": "Central Station", "lat": 52.1, "lng": 21.0},
                {"number": 2, "name": "North Station", "lat": 52.2, "lng": 21.1}
            ]
        }

        Response:
        {
            "stations_usage": [
                {
                    "pin_number": 2,
                    "station_name": "North Station",
                    "hourly_usage": [95, 48, 38, ...]
                },
                {
                    "pin_number": 3,
                    "station_name": "East Station",
                    "hourly_usage": [100, 50, 40, ...]
                },
                {
                    "pin_number": 4,
                    "station_name": "west Station",
                    "hourly_usage": [100, 50, 40, ...]
                }
            ]
        }
        """
        new_station = request.data.get("new_station")
        existing_stations = request.data.get("existing_stations", [])

        # Validacja
        if not new_station:
            return Response(
                {"error": "new_station is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(new_station, dict):
            return Response(
                {"error": "new_station must be a dict"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(existing_stations, list):
            return Response(
                {"error": "existing_stations must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_num = new_station.get("number")
        new_name = new_station.get("name", f"Station {new_num}")

        print(f"Obliczanie użycia dla nowego przystanku: {new_name} (#{new_num})")
        print(f"Istniejące przystanki: {len(existing_stations)}")

        try:
            # Oblicz użycie dla nowego przystanku i jego sąsiadów
            stations_usage = calculate_metro_usage_for_single_station(
                new_station,
                existing_stations
            )

        except Exception as e:
            print(f"Błąd obliczania użycia: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Calculation error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        print(f"  Obliczenia zakończone dla {len(stations_usage)} przystanków")
        for station in stations_usage:
            print(f"    - {station['station_name']}: suma dobowa = {sum(station['hourly_usage'])}")

        return Response(
            {
                "stations_usage": stations_usage
            },
            status=status.HTTP_200_OK,
        )