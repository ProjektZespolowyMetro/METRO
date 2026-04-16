from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GameScore",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("line_name", models.CharField(blank=True, default="Linia metra", max_length=64)),
                ("daily_profit_usd", models.FloatField()),
                ("total_length_meters", models.FloatField(default=0)),
                ("num_stations", models.PositiveIntegerField(default=0)),
                ("train_frequency_minutes", models.PositiveIntegerField(default=5)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="metro_scores", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "ordering": ["-daily_profit_usd", "created_at"],
            },
        ),
    ]
