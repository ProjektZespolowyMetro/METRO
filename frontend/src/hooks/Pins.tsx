import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Pin, ToolMode } from '../contexts/PinsContext';
import { createPinIcon } from '../utils/MapUtils';

type UsePinSyncProps = {
    map: L.Map | null;
    pins: Pin[];
    addPin: (pin: Pin) => void;
    updatePin: (updatedPin: Pin) => void;
    removePin: (id: string) => void;
    activeTool: ToolMode;
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

    // 1. Map Click - Place Pins (Left Click Only)
    useEffect(() => {
        if (!map) return;
        if (!markersLayerRef.current)
            markersLayerRef.current = L.layerGroup().addTo(map);

        const handleClick = (e: L.LeafletMouseEvent) => {
            if (activeTool !== 'place' || e.originalEvent.button !== 0) return;
            addPin({
                id: crypto.randomUUID(),
                lat: e.latlng.lat,
                lng: e.latlng.lng,
            });
        };

        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
        };
    }, [map, addPin, activeTool]);

    useEffect(() => {
        if (!map) return;
        const el = map.getContainer();
        const prevCursor = el.style.cursor;

        if (activeTool === 'place') {
            el.style.cursor = 'crosshair';
        } else if (activeTool === 'drag') {
            el.style.cursor = 'grab';
        } else {
            el.style.cursor = '';
        }

        map.dragging.disable();

        let lastPos: L.Point | null = null;
        const onMouseDown = (e: L.LeafletMouseEvent) => {
            if (e.originalEvent.button === 2 || activeTool === 'normal') {
                //map dragging HAS TO BE ENABLED HERE. If you enable it before right click it will fucking lag on tools other than normal one.
                map.dragging.enable();
                lastPos = map.mouseEventToContainerPoint(e.originalEvent);
                el.style.cursor = 'grabbing';
            }
        };

        const onMouseMove = (e: L.LeafletMouseEvent) => {
            if (lastPos) {
                const currentPos = map.mouseEventToContainerPoint(
                    e.originalEvent
                );
                map.panBy(lastPos.subtract(currentPos), { animate: false });
                lastPos = currentPos;
            }
        };

        const onMouseUp = (e: L.LeafletMouseEvent) => {
            map.dragging.disable();

            if (e.originalEvent.button === 2) {
                lastPos = null;

                if (activeTool === 'place') {
                    el.style.cursor = 'crosshair';
                } else if (activeTool === 'drag') {
                    el.style.cursor = 'grab';
                } else {
                    el.style.cursor = '';
                }
            }
        };

        const preventMenu = (e: Event) => e.preventDefault();

        map.on('mousedown', onMouseDown);
        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);
        el.addEventListener('contextmenu', preventMenu);

        return () => {
            el.style.cursor = prevCursor;
            map.dragging.enable();
            map.off('mousedown', onMouseDown);
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
            el.removeEventListener('contextmenu', preventMenu);
        };
    }, [map, activeTool]);

    useEffect(() => {
        if (!map || !markersLayerRef.current) return;
        const markersLayer = markersLayerRef.current;
        markersLayer.clearLayers();

        pins.forEach((pin) => {
            const isSelected = pin.id === selectedPinId;
            const marker = L.marker([pin.lat, pin.lng], {
                icon: createPinIcon(pin.number, isSelected),
                draggable: activeTool === 'drag',
                zIndexOffset: isSelected ? 1000 : 0,
            }).addTo(markersLayer);

            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                onSelectPinId(pin.id);
            });

            marker.on('contextmenu', (e) => {
                L.DomEvent.stopPropagation(e);
                onRequestEditPinId(pin.id);
            });

            if (activeTool === 'drag') {
                marker.on('dragend', (e: L.LeafletEvent) => {
                    const ll = (e.target as L.Marker).getLatLng();
                    updatePin({ ...pin, lat: ll.lat, lng: ll.lng });
                });
            }
        });

        if (drawnRoadLayerRef.current) drawnRoadLayerRef.current.remove();
        const numberedPins = pins
            .filter((p) => p.number !== undefined)
            .sort((a, b) => a.number! - b.number!);
        if (numberedPins.length >= 2) {
            drawnRoadLayerRef.current = L.polyline(
                numberedPins.map((p) => [p.lat, p.lng] as [number, number]),
                { color: 'blue', weight: 5 }
            ).addTo(map);
        }
    }, [
        map,
        pins,
        updatePin,
        selectedPinId,
        onSelectPinId,
        onRequestEditPinId,
        activeTool,
    ]);
}
