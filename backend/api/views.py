from django.http import HttpResponse
from django.views import View
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import IntegrityError
import math
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from core.calculator import calculate_total_metro_usage
from .models import GameScore

class HelloWorldView(View):
    def get(self, request):
        return HttpResponse("Hello world!")


#STAŁE BUDOWY METRA
METRO_TUNNEL_COST_PER_KM = 238.21  # mln USD za km tunelu
METRO_STATION_COST = 80             # mln USD za stację

#STAŁE UTRZYMANIA METRA DZIENNIE
METRO_DAILY_MAINTENANCE_5MIN = 10000    # USD za dzień (kursy co 5 minut)
METRO_DAILY_MAINTENANCE_10MIN = 20000   # USD za dzień (kursy co 10 minut)


def calculate_total_daily_rides(metro_usage):
    if not isinstance(metro_usage, dict) or "error" in metro_usage:
        return 0

    total = 0
    for _, values in metro_usage.items():
        if not isinstance(values, list):
            continue
        total += sum(float(v) for v in values)
    return total


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        if len(username) < 3:
            return Response(
                {"error": "Username must have at least 3 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 6:
            return Response(
                {"error": "Password must have at least 6 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.create_user(username=username, password=password)
        except IntegrityError:
            return Response(
                {"error": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token = Token.objects.create(user=user)
        return Response(
            {"username": user.username, "token": token.key},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"username": user.username, "token": token.key},
            status=status.HTTP_200_OK,
        )


class SaveScoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            daily_profit_usd = float(request.data.get("daily_profit_usd"))
        except (TypeError, ValueError):
            return Response(
                {"error": "daily_profit_usd must be a number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        line_name = (request.data.get("line_name") or "Linia metra").strip()[:64]
        total_length_meters = float(request.data.get("total_length_meters") or 0)
        num_stations = int(request.data.get("num_stations") or 0)
        train_frequency_minutes = int(request.data.get("train_frequency_minutes") or 5)

        score = GameScore.objects.create(
            user=request.user,
            line_name=line_name,
            daily_profit_usd=daily_profit_usd,
            total_length_meters=total_length_meters,
            num_stations=num_stations,
            train_frequency_minutes=train_frequency_minutes,
        )

        return Response(
            {
                "id": score.id,
                "daily_profit_usd": score.daily_profit_usd,
                "line_name": score.line_name,
            },
            status=status.HTTP_201_CREATED,
        )


class RankingView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 10))
        except ValueError:
            limit = 10

        limit = max(1, min(limit, 100))
        scores = GameScore.objects.select_related("user").all()[:limit]

        results = []
        for idx, score in enumerate(scores, start=1):
            results.append(
                {
                    "rank": idx,
                    "username": score.user.username,
                    "line_name": score.line_name,
                    "daily_profit_usd": score.daily_profit_usd,
                    "num_stations": score.num_stations,
                    "total_length_meters": score.total_length_meters,
                    "created_at": score.created_at,
                }
            )

        return Response({"results": results}, status=status.HTTP_200_OK)

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