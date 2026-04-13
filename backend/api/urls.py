from django.contrib import admin
from django.urls import path

from . import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("pins/", views.ReceivePinsView.as_view()),
    path("calculate-new-stations/", views.CalculateNewStationsUsageView.as_view()),
]
