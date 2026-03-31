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

    // Create a ref to always have access to the latest pins in our map event listeners
    // without needing to put `pins` in the dependency array (which would cause constant rebinding).
    const pinsRef = useRef(pins);
    useEffect(() => {
        pinsRef.current = pins;
    }, [pins]);

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
        } else if (activeTool === 'delete') {
            el.style.cursor = 'crosshair';
        } else {
            el.style.cursor = '';
        }

        map.dragging.disable();

        // Variables for Map Panning
        let lastPos: L.Point | null = null;

        // Variables for Delete Selection Box
        let deleteStartLatLng: L.LatLng | null = null;
        let deleteRect: L.Rectangle | null = null;

        const onMouseDown = (e: L.LeafletMouseEvent) => {
            if (e.originalEvent.button === 2 || activeTool === 'normal') {
                map.dragging.enable();
                lastPos = map.mouseEventToContainerPoint(e.originalEvent);
                el.style.cursor = 'grabbing';
            } else if (
                activeTool === 'delete' &&
                e.originalEvent.button === 0
            ) {
                // Initialize the delete selection box
                deleteStartLatLng = e.latlng;
                deleteRect = L.rectangle(L.latLngBounds(e.latlng, e.latlng), {
                    color: '#ff0000', // Red border
                    weight: 2,
                    fillColor: '#ff0000', // Red fill
                    fillOpacity: 0.2,
                    dashArray: '5, 5', // Dashed line
                }).addTo(map);
            }
        };

        const onMouseMove = (e: L.LeafletMouseEvent) => {
            if (lastPos) {
                const currentPos = map.mouseEventToContainerPoint(
                    e.originalEvent
                );
                map.panBy(lastPos.subtract(currentPos), { animate: false });
                lastPos = currentPos;
            } else if (
                deleteStartLatLng &&
                deleteRect &&
                activeTool === 'delete'
            ) {
                // Update the bounds of the rectangle as the user drags
                deleteRect.setBounds(
                    L.latLngBounds(deleteStartLatLng, e.latlng)
                );
            }
        };

        const onMouseUp = (e: L.LeafletMouseEvent) => {
            map.dragging.disable();

            if (e.originalEvent.button === 2 || activeTool === 'normal') {
                lastPos = null;
                if (activeTool === 'place') el.style.cursor = 'crosshair';
                else if (activeTool === 'drag') el.style.cursor = 'grab';
                else el.style.cursor = '';
            }

            // Handle the completion of the delete selection box
            if (deleteStartLatLng && deleteRect) {
                const bounds = deleteRect.getBounds();

                // Ensure it was an actual drag and not just a single click
                // (Single clicks are handled by the marker's own click event)
                const isClick = deleteStartLatLng.equals(e.latlng, 0.0001);

                if (!isClick) {
                    // Loop through the LATEST pins and delete those inside the box
                    pinsRef.current.forEach((pin) => {
                        if (bounds.contains([pin.lat, pin.lng])) {
                            removePin(pin.id);
                        }
                    });
                }

                // Cleanup visual layer and state
                deleteRect.remove();
                deleteRect = null;
                deleteStartLatLng = null;
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
    }, [map, activeTool, removePin]);

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

            marker.on('click', (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e);

                if (activeTool === 'delete' && e.originalEvent.button === 0) {
                    removePin(pin.id);
                } else {
                    onSelectPinId(pin.id);
                }
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
        removePin,
        selectedPinId,
        onSelectPinId,
        onRequestEditPinId,
        activeTool,
    ]);
}
