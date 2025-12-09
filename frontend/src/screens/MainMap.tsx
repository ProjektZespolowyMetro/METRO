import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function RoadsMap() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const pinCounterRef = useRef(1);

  useEffect(() => {
    const geojsonFiles = [
      "cracow-streets1.geojson",
      "cracow-streets2.geojson",
      "cracow-streets3.geojson",
      "cracow-streets4.geojson",
    ];

    if (!mapRef.current && mapContainerRef.current) {
      // init and center on cracow
      mapRef.current = L.map(mapContainerRef.current).setView([50.0647, 19.945], 20);

      // openstreetmap tiles, generates background
      // if deleted we will have only red lines from geojsons
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapRef.current);

      const layers: L.Layer[] = [];

      geojsonFiles.forEach((file) => {
        fetch(file)
          .then((res) => res.json())
          .then((geojson) => {
            const layer = L.geoJSON(geojson, {
              style: { color: "red", weight: 4 },
              onEachFeature: (feature, layer) => {
                layer.on("click", (e: L.LeafletMouseEvent) => {
                  const { lat, lng } = e.latlng;

                  // numbered pin
                  const numberedIcon = L.divIcon({
                    html: `<div style="
                      background-color: blue; 
                      color: white; 
                      border-radius: 50%; 
                      width: 30px; 
                      height: 30px; 
                      display: flex; 
                      align-items: center; 
                      justify-content: center;
                      border: 2px solid white;
                      font-weight: bold;
                    ">${pinCounterRef.current}</div>`,
                    className: "",
                    iconSize: [30, 30],
                    iconAnchor: [15, 30], // tip of the pin
                    popupAnchor: [0, -35],
                  });

                  // add marker to the map
                  L.marker([lat, lng], { icon: numberedIcon })
                    .addTo(mapRef.current!)
                    .bindPopup(
                        // might be useful someday when passing to backend
                      feature.properties
                        ? `Road info: ${JSON.stringify(feature.properties)}`
                        : "No properties"
                    )
                    .openPopup();

                  // increment pin
                  // TODO: add deleting pins and add the lowest number next time we place a pin
                  // currently even if we were to delete a pin (not implemented yet) next pin would have
                  // the next number instead of deleted one
                  pinCounterRef.current += 1;
                });
              },
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