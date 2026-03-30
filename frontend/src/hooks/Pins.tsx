import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Pin, ToolMode } from '../contexts/PinsContext'; // Added ToolMode
import { createPinIcon } from '../utils/MapUtils';

type UsePinSyncProps = {
    map: L.Map | null;
    pins: Pin[];
    addPin: (pin: Pin) => void;
    updatePin: (updatedPin: Pin) => void;
    removePin: (id: string) => void;
    activeTool: ToolMode; // Replaced isAddMode with activeTool
    selectedPinId: string | null;
    onSelectPinId: (id: string) => void;
    onRequestEditPinId: (id: string) => void;
};

export function usePinSync({
    map,
    pins,
    addPin,
    updatePin,
    removePin,
    activeTool,
    selectedPinId,
    onSelectPinId,
    onRequestEditPinId,
}: UsePinSyncProps) {
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const drawnRoadLayerRef = useRef<L.Polyline | null>(null);

    // 1. Handle Map Clicks & Place Mode
    useEffect(() => {
        if (!map) return;

        if (!markersLayerRef.current) {
            markersLayerRef.current = L.layerGroup().addTo(map);
        }

        const handleMapClick = (e: L.LeafletMouseEvent) => {
            // STRICT CHECK: Only add pins if in 'place' mode
            if (activeTool !== 'place') return;

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
    }, [map, addPin, activeTool]);

    // 2. Handle Cursor and Map Interactions
    useEffect(() => {
        if (!map) return;

        const el = map.getContainer();
        const prevCursor = el.style.cursor;

        // Visual feedback for tools
        if (activeTool === 'place') {
            el.style.cursor = 'crosshair';
            map.dragging.enable();
        } else if (activeTool === 'drag') {
            el.style.cursor = 'grab';
            map.dragging.disable(); // Optional: disable map pan to make pin dragging easier
        } else {
            el.style.cursor = '';
            map.dragging.enable();
        }

        return () => {
            el.style.cursor = prevCursor;
            map.dragging.enable();
        };
    }, [map, activeTool]);

    // 3. Render Markers and Sync State
    useEffect(() => {
        if (!map || !markersLayerRef.current) return;

        markersLayerRef.current.clearLayers();

        pins.forEach((pin) => {
            const isSelected = pin.id === selectedPinId;

            const marker = L.marker([pin.lat, pin.lng], {
                icon: createPinIcon(pin.number, isSelected),
                // Only draggable if the 'drag' tool is active
                draggable: activeTool === 'drag',
                zIndexOffset: isSelected ? 1000 : 0,
            }).addTo(markersLayerRef.current!);

            marker.on('click', (e) => {
                // Prevent the map from receiving the click (which might trigger 'place' mode)
                L.DomEvent.stopPropagation(e);
                onSelectPinId(pin.id);
            });

            marker.on('contextmenu', (e) => {
                L.DomEvent.stopPropagation(e);
                onRequestEditPinId(pin.id);
            });

            marker.on('dragend', (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                updatePin({ ...pin, lat: ll.lat, lng: ll.lng });
            });
        });

        // 4. Draw Polyline
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
    }, [
        map,
        pins,
        updatePin,
        removePin,
        selectedPinId,
        onSelectPinId,
        onRequestEditPinId,
        activeTool, // Added dependency
    ]);
}
