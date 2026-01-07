import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import SendPinsButton from "../components/SendPinsButton";


type Pin = {
  id: string;
  lat: number;
  lng: number;
  number?: number;
  name?: string;
};

export default function RoadsMap() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // data
  const pinsRef = useRef<Pin[]>([]);

  // layers
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const drawnRoadLayerRef = useRef<L.Polyline | null>(null);

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

      // street geojsons
      geojsonFiles.forEach((file) => {
        fetch(file)
          .then((res) => res.json())
          .then((geojson) => {
            L.geoJSON(geojson, {
              style: { color: "red", weight: 4 },
            }).addTo(mapRef.current!);
          })
          .catch((err) =>
            console.error(`Failed to load ${file}:`, err)
          );
      });
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);

      // add pin on map click
      mapRef.current.on("click", (e: L.LeafletMouseEvent) => {
        addPin(e.latlng.lat, e.latlng.lng);
      });
    }
  }, [addPin]);

  function createPinIcon(number?: number) {
    return L.divIcon({
      html: number
        ? `<div style="
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
          ">${number}</div>`
        : `<div style="
            background-color: gray;
            border-radius: 50%;
            width: 14px;
            height: 14px;
          "></div>`,
      className: "",
      iconSize: number ? [30, 30] : [14, 14],
      iconAnchor: number ? [15, 30] : [7, 7],
    });
  }

  function sendPinsToBackend() {
    const payload = pinsRef.current
      .filter(p => p.number !== undefined)
      .sort((a, b) => a.number! - b.number!)
      .map(p => ({
        number: p.number,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
      }));

    fetch("http://127.0.0.1:8000/api/pins/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pins: payload }),
    })
      .then(res => res.json())
      .then(data => {
        console.log("Backend response:", data);
      })
      .catch(err => {
        console.error("Failed to send pins:", err);
      });
  }

  function redrawUserRoad() {
    if (!mapRef.current) return;

    // ONLY remove the previously drawn user road
    if (drawnRoadLayerRef.current) {
      drawnRoadLayerRef.current.remove();
    }

    const numberedPins = [...pinsRef.current]
      .filter((p) => p.number !== undefined)
      .sort((a, b) => a.number! - b.number!);

    if (numberedPins.length < 2) return;

    const latlngs = numberedPins.map(
      (p) => [p.lat, p.lng] as [number, number]
    );

    drawnRoadLayerRef.current = L.polyline(latlngs, {
      color: "blue",
      weight: 5,
    }).addTo(mapRef.current);
  }

  function addPin(lat: number, lng: number) {
    if (!mapRef.current || !markersLayerRef.current) return;

    const pin: Pin = {
      id: crypto.randomUUID(),
      lat,
      lng,
    };

    pinsRef.current.push(pin);

    const marker = L.marker([lat, lng], {
      icon: createPinIcon(),
      draggable: true,
    }).addTo(markersLayerRef.current);

    // change number
   marker.on("click", () => {
    const input = prompt(
      "Enter pin number. Anything else deletes the pin:",
      pin.number?.toString() ?? ""
    );

    const n = Number(input);

    // delete if invalid
    if (!Number.isInteger(n) || n <= 0) {
      markersLayerRef.current!.removeLayer(marker);
      pinsRef.current = pinsRef.current.filter(p => p.id !== pin.id);
      redrawUserRoad();
      return;
    }

    // ask for name
    const name = prompt(
      "Enter pin name:",
      pin.name ?? ""
    ) ?? undefined;

    // delete any existing pin with same number
    const existingPin = pinsRef.current.find(
      p => p.number === n && p.id !== pin.id
    );

    if (existingPin) {
      markersLayerRef.current!.eachLayer(layer => {
        const m = layer as L.Marker;
        const ll = m.getLatLng();
        if (ll.lat === existingPin.lat && ll.lng === existingPin.lng) {
          markersLayerRef.current!.removeLayer(m);
        }
      });

      pinsRef.current = pinsRef.current.filter(
        p => p.id !== existingPin.id
      );
    }

    pin.number = n;
    pin.name = name;
    marker.setIcon(createPinIcon(pin.number));
    redrawUserRoad();
  });



    // drag updates road
    marker.on("dragend", (e) => {
      const ll = (e.target as L.Marker).getLatLng();
      pin.lat = ll.lat;
      pin.lng = ll.lng;
      redrawUserRoad();
    });
  }

  return (
      <><SendPinsButton onClick={sendPinsToBackend}/>
        <div
            ref={mapContainerRef}
            style={{width: "100%", height: "100vh"}}/>
      </>
  );
}
