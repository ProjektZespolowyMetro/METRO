from django.test import SimpleTestCase

from api.tests.helpers.usage_report import compute_usage_breakdown, print_metro_usage_report
from api.tests.fixtures.krakow_stations import KRAKOW_METRO_LINE


class MetroUsageReportTests(SimpleTestCase):
    """
    Wypisuje raport użycia metra przy uruchomieniu testów.
    Uruchom sam raport: python manage.py test api.tests.unit.test_usage_report
    """

    def test_print_krakow_metro_usage_report(self):
        print_metro_usage_report()
        breakdown = compute_usage_breakdown(KRAKOW_METRO_LINE)
        for station in KRAKOW_METRO_LINE:
            row = breakdown[station["number"]]
            self.assertGreater(row["total_daily"], 0)
