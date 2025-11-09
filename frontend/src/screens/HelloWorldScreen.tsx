import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function RoadsMap() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // List of GeoJSON files
  const geojsonFiles = [
    "cracow-streets1.geojson",
    "cracow-streets2.geojson",
    "cracow-streets3.geojson",
    "cracow-streets4.geojson",
  ];

  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
      // init and center on cracow
      mapRef.current = L.map(mapContainerRef.current).setView([50.0647, 19.945], 13);

      // openstreetmap tiles, generates background
      // if deleted we will have only red lines from geojson
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapRef.current);

      const layers: L.Layer[] = [];

      geojsonFiles.forEach((file) => {
        fetch(file)
          .then((res) => res.json())
          .then((geojson) => {
            const layer = L.geoJSON(geojson, {
              style: { color: "red", weight: 2 },
            }).addTo(mapRef.current!);
            layers.push(layer);

            const group = L.featureGroup(layers);
            mapRef.current!.fitBounds(group.getBounds());
          })
          .catch((err) => console.error(`Failed to load ${file}:`, err));
      });
    }
  }, []);

  return <div ref={mapContainerRef} style={{ width: "100%", height: "100vh" }} />;
}
