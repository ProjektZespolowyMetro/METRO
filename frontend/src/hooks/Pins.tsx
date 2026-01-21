import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Pin } from '../contexts/PinsContext';
import { createPinIcon } from '../utils/MapUtils';

type UsePinSyncProps = {
    map: L.Map | null;
    pins: Pin[];
    addPin: (pin: Pin) => void;
    updatePin: (updatedPin: Pin) => void;
    removePin: (id: string) => void;
};

export function usePinSync({
    map,
    pins,
    addPin,
    updatePin,
    removePin,
}: UsePinSyncProps) {
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const drawnRoadLayerRef = useRef<L.Polyline | null>(null);

    useEffect(() => {
        if (!map) return;

        // We use a separate LayerGroup for pins if it doesnt exist
        if (!markersLayerRef.current) {
            markersLayerRef.current = L.layerGroup().addTo(map);
        }

        const handleMapClick = (e: L.LeafletMouseEvent) => {
            const newPin: Pin = {
                id: crypto.randomUUID(),
                lat: e.latlng.lat,
                lng: e.latlng.lng,
            };
            addPin(newPin);
        };

        map.on('click', handleMapClick);

        return () => {
            map.off('click', handleMapClick);
        };
    }, [map, addPin]); // Re-binds if map or addPin changes

    // sync pins and draw road
    useEffect(() => {
        if (!map || !markersLayerRef.current) return;

        // Clear existing markers to redraw based on latest state
        markersLayerRef.current.clearLayers();

        pins.forEach((pin) => {
            const marker = L.marker([pin.lat, pin.lng], {
                icon: createPinIcon(pin.number),
                draggable: true,
            }).addTo(markersLayerRef.current!);

            marker.on('click', (e) => {
                // prevent map click from firing when clicking a marker
                L.DomEvent.stopPropagation(e);

                const input = prompt(
                    'Enter pin number. Anything else deletes the pin:',
                    pin.number?.toString() ?? ''
                );
                const n = Number(input);

                if (!Number.isInteger(n) || n <= 0) {
                    removePin(pin.id);
                    return;
                }

                const name =
                    prompt('Enter pin name:', pin.name ?? '') ?? undefined;

                // Handle duplicate numbers
                const existingPin = pins.find(
                    (p) => p.number === n && p.id !== pin.id
                );
                if (existingPin) removePin(existingPin.id);

                updatePin({ ...pin, number: n, name });
            });

            marker.on('dragend', (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                updatePin({ ...pin, lat: ll.lat, lng: ll.lng });
            });
        });

        // redraw the blue road
        if (drawnRoadLayerRef.current) {
            drawnRoadLayerRef.current.remove();
        }

        const numberedPins = [...pins]
            .filter((p) => p.number !== undefined)
            .sort((a, b) => a.number! - b.number!);

        if (numberedPins.length >= 2) {
            const latlngs = numberedPins.map(
                (p) => [p.lat, p.lng] as [number, number]
            );
            drawnRoadLayerRef.current = L.polyline(latlngs, {
                color: 'blue',
                weight: 5,
            }).addTo(map);
        }
    }, [map, pins, updatePin, removePin]);
}
