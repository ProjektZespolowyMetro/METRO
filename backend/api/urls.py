from django.urls import path

from . import views

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view()),
    path("auth/login/", views.LoginView.as_view()),
    path("scores/", views.SaveScoreView.as_view()),
    path("scores/ranking/", views.RankingView.as_view()),
    path("pins/", views.ReceivePinsView.as_view()),
    path("calculate-new-stations/", views.CalculateNewStationsUsageView.as_view()),
]
