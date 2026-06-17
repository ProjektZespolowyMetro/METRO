from django.contrib import admin
from .models import GameScore


@admin.register(GameScore)
class GameScoreAdmin(admin.ModelAdmin):
	list_display = ("user", "line_name", "daily_profit_usd", "num_stations", "created_at")
	list_filter = ("created_at", "train_frequency_minutes")
	search_fields = ("user__username", "line_name")
