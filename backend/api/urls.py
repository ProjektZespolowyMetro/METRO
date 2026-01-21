from django.contrib import admin
from django.urls import path

from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('hello-world/', views.HelloWorldView.as_view()),
    path("pins/", views.ReceivePinsView.as_view()),
]
