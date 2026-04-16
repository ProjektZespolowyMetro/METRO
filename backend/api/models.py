from django.db import models
from django.contrib.auth.models import User


class GameScore(models.Model):
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="metro_scores")
	line_name = models.CharField(max_length=64, default="Linia metra", blank=True)
	daily_profit_usd = models.FloatField()
	total_length_meters = models.FloatField(default=0)
	num_stations = models.PositiveIntegerField(default=0)
	train_frequency_minutes = models.PositiveIntegerField(default=5)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-daily_profit_usd", "created_at"]

	def __str__(self):
		return f"{self.user.username} - {self.daily_profit_usd:.2f} USD/d"
