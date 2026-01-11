from django.http import HttpResponse
from django.views import View
import math
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

#calculator import
try:
    from core.scripts.calculator import calculate_total_metro_usage
except ImportError as e:
    print(f"Error in importing calculator.py: {e}")
    calculate_total_metro_usage = None

class HelloWorldView(View):
    def get(self, request):
        return HttpResponse("Hello world!")


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

    def post(self, request):
        pins = request.data.get("pins", [])

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

        if calculate_total_metro_usage:
            try:
                print(" call calc total_metro_usage ")
                # it will print data to console
                metro_usage_results = calculate_total_metro_usage(pins)
            except Exception as e:
                print(f"calculator error {e}")
                metro_usage_results = {"error": str(e)}
        else:
            print("calculator import error")


        return Response(
            {
                "pins": pins,
                "segments": segments,
                "total_length_meters": round(total_length, 2),
                # added metro usage below
                "metro_usage": metro_usage_results,
            },
            status=status.HTTP_200_OK,
        )