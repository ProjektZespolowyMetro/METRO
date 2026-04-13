import React, { useRef, useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import PinOverlay from '../components/PinOverlay';
import RoutesLayer from '../hooks/RoutesLayer';

import { usePins } from '../contexts/PinsContext';
import { RoutesProvider } from '../contexts/RoutesContext';
import { useMapInit } from '../hooks/InitMap';
import { usePinSync } from '../hooks/Pins';

import {
    sendPinsToBackend,
    MetroUsageByPinNumber,
} from '../services/SendPinsToApi';

export default function MainMap() {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    const [constructionCosts, setConstructionCosts] = useState<any | null>(
        null
    );
    const [maintenanceCosts, setMaintenanceCosts] = useState<any>(null);
    const [metroUsage, setMetroUsage] = useState<any>(null);

    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const [forceEditSelectedPin, setForceEditSelectedPin] = useState(false);

    const [sendError, setSendError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    const { pins, addPin, updatePin, removePin, clearPins, activeTool } =
        usePins();

    const map = useMapInit(mapContainerRef);

    usePinSync({
        map,
        pins,
        addPin,
        updatePin,
        removePin,
        selectedPinId,
        activeTool,
        onSelectPinId: (id) => {
            setSelectedPinId(id);
            setForceEditSelectedPin(false);
            setSendError(null);
        },
        onRequestEditPinId: (id) => {
            setSelectedPinId(id);
            setForceEditSelectedPin(true);
            setSendError(null);
        },
    });

    useEffect(() => {
        if (!map) return;

        const container = map.getContainer();

        const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 2) return;
            e.preventDefault();
            const simulated = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                clientX: e.clientX,
                clientY: e.clientY,
                button: 0,
            });
            container.dispatchEvent(simulated);
        };

        const onContextMenu = (e: MouseEvent) => e.preventDefault();

        container.addEventListener('mousedown', onMouseDown);
        container.addEventListener('contextmenu', onContextMenu);

        return () => {
            container.removeEventListener('mousedown', onMouseDown);
            container.removeEventListener('contextmenu', onContextMenu);
        };
    }, [map]);

    const selectedPin = pins.find((p) => p.id === selectedPinId) ?? null;

    const handleSendPins = async () => {
        if (isSending) return;

        const firstMissing = pins.find((p) => p.number === undefined);

        if (firstMissing) {
            if (map) {
                const target = L.latLng(firstMissing.lat, firstMissing.lng);
                const nextZoom = Math.max(map.getZoom(), 16);
                map.flyTo(target, nextZoom, { animate: true, duration: 0.6 });
            }
            setSelectedPinId(firstMissing.id);
            setForceEditSelectedPin(true);
            setSendError(
                'Nadaj numer każdej pinezce przed wysłaniem (PPM lub „Edytuj” w dymku).'
            );
            return;
        }

        try {
            setIsSending(true);
            setSendError(null);
            const data = await sendPinsToBackend(pins);
            setMaintenanceCosts(data.maintenance_costs ?? null);
            setMetroUsage(data.metro_usage ?? null);
            setConstructionCosts(data.construction_costs ?? null);
        } catch (e) {
            setSendError(
                e instanceof Error ? e.message : 'Nie udało się wysłać pinów.'
            );
        } finally {
            setIsSending(false);
        }
    };

    return (
        <RoutesProvider>
            <div
                style={{ position: 'relative', width: '100%', height: '100vh' }}
            >
                {/* MAP CONTAINER */}
                <div
                    ref={mapContainerRef}
                    style={{ width: '100%', height: '100%' }}
                />

                {/* ROADS — rendered as native Leaflet GeoJSON polylines */}
                <RoutesLayer map={map} />

                {/* SELECTED PIN OVERLAY */}
                {map && selectedPin && (
                    <PinOverlay
                        map={map}
                        pin={selectedPin}
                        pins={pins}
                        updatePin={updatePin}
                        removePin={removePin}
                        metroUsage={metroUsage}
                        forceEdit={forceEditSelectedPin}
                        onForceEditConsumed={() =>
                            setForceEditSelectedPin(false)
                        }
                        onClose={() => {
                            setSelectedPinId(null);
                            setForceEditSelectedPin(false);
                        }}
                    />
                )}
            </div>
        </RoutesProvider>
    );
}
