import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Pin } from '../contexts/PinsContext';
import { createPinIcon } from '../utils/MapUtils';

type UsePinSyncProps = {
    map: L.Map | null;
    pins: Pin[];
    updatePin: (updatedPin: Pin) => void;
    selectedPinId: string | null;
    onSelectPinId: (id: string | null) => void;
    onRequestEditPinId: (id: string) => void;
    onMapBlankRightClick: (lat: number, lng: number) => void;
    onMapBlankLeftClick: (eventTarget: EventTarget | null) => void;
};

export function usePinSync({
                               map,
                               pins,
                               updatePin,
                               selectedPinId,
                               onSelectPinId,
                               onRequestEditPinId,
                               onMapBlankRightClick,
                               onMapBlankLeftClick,
                           }: UsePinSyncProps) {
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const drawnRoadLayerRef = useRef<L.Polyline | null>(null);

    useEffect(() => {
        if (!map) return;

        if (!markersLayerRef.current) {
            markersLayerRef.current = L.layerGroup().addTo(map);
        }

        const handleMapClick = (e: L.LeafletMouseEvent) =>
            onMapBlankLeftClick(e.originalEvent?.target ?? null);

        const handleMapContextMenu = (e: L.LeafletMouseEvent) => {
            L.DomEvent.preventDefault(e.originalEvent);
            onMapBlankRightClick(e.latlng.lat, e.latlng.lng);
        };

        map.on('click', handleMapClick);
        map.on('contextmenu', handleMapContextMenu);

        return () => {
            map.off('click', handleMapClick);
            map.off('contextmenu', handleMapContextMenu);
        };
    }, [map, onMapBlankLeftClick, onMapBlankRightClick]);
    useEffect(() => {
        if (!map || !markersLayerRef.current) return;

        markersLayerRef.current.clearLayers();

        pins.forEach((pin) => {
            const isSelected = pin.id === selectedPinId;

            const marker = L.marker([pin.lat, pin.lng], {
                icon: createPinIcon(pin.number, isSelected, Boolean(pin.isDraft)),
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
            .filter((p) => !p.isDraft && p.number !== undefined)
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
        selectedPinId,
        onSelectPinId,
        onRequestEditPinId,
    ]);
}