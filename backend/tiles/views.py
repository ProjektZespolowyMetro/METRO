import os
import sqlite3

from django.conf import settings
from django.http import Http404, HttpResponse
from django.views.decorators.cache import cache_control

MBTILES_PATH = os.path.join(settings.BASE_DIR, "data", "hg.mbtiles")


@cache_control(public=True, max_age=3600)  # Cache tiles for 1 hour
def get_tile(request, z, x, y):
    z = int(z)
    x = int(x)
    y = int(y)

    if not os.path.exists(MBTILES_PATH):
        raise Http404("MBTiles file not found")

    conn = sqlite3.connect(MBTILES_PATH)
    cursor = conn.cursor()

    # Use 'y' directly since the client is already sending the TMS row!
    cursor.execute(
        "SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?",
        (z, x, y),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise Http404(f"Tile not found: z={z}, x={x}, y={y}")

    tile_data = row[0]

    # application/vnd.mapbox-vector-tile is the standard MIME type for MVTs
    response = HttpResponse(
        tile_data, content_type="application/vnd.mapbox-vector-tile"
    )

    # Check if the data is gzipped (starts with magic numbers 1f 8b)
    if tile_data.startswith(b"\x1f\x8b"):
        response["Content-Encoding"] = "gzip"

    return response
