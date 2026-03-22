from django.urls import path

from .views import get_tile

urlpatterns = [
    path("<int:z>/<int:x>/<int:y>.pbf", get_tile),
]
