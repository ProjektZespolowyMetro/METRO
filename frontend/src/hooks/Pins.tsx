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
                               selectedPinId,
                               onSelectPinId,
                               onRequestEditPinId,
                           }: UsePinSyncProps) {
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const drawnRoadLayerRef = useRef<L.Polyline | null>(null);

    useEffect(() => {
        if (!map) return;

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
    }, [map, addPin]);

    useEffect(() => {
        if (!map || !markersLayerRef.current) return;

        markersLayerRef.current.clearLayers();

        pins.forEach((pin) => {
            const isSelected = pin.id === selectedPinId;

            const marker = L.marker([pin.lat, pin.lng], {
                icon: createPinIcon(pin.number, isSelected),
                draggable: true,
                zIndexOffset: isSelected ? 1000 : 0,
            }).addTo(markersLayerRef.current!);

            marker.on('click', (e) => {
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
    ]);
}