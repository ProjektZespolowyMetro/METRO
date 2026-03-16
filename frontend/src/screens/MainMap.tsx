import React, { useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import PinMenu from '../components/PinMenu';
import PinOverlay from '../components/PinOverlay';

import { usePins } from '../contexts/PinsContext';
import { useMapInit } from '../hooks/InitMap';
import { usePinSync } from '../hooks/Pins';

import {
    sendPinsToBackend,
    MetroUsageByPinNumber,
} from '../services/SendPinsToApi';

export default function MainMap() {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    const [isAddMode, setIsAddMode] = useState(true);

    const [constructionCosts, setConstructionCosts] = useState<any | null>(null);
    const [maintenanceCosts, setMaintenanceCosts] = useState<any>(null);
    const [metroUsage, setMetroUsage] = useState<any>(null);

    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const [forceEditSelectedPin, setForceEditSelectedPin] = useState(false);

    const [sendError, setSendError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    const { pins, addPin, updatePin, removePin, clearPins } = usePins();

    const map = useMapInit(mapContainerRef);

    usePinSync({
        map,
        pins,
        addPin,
        updatePin,
        removePin,
        selectedPinId,
        isAddMode,
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

    const selectedPin = pins.find((p) => p.id === selectedPinId) ?? null;

    const handleSendPins = async () => {
        if (isSending) return;

        const firstMissing = pins.find((p) => p.number === undefined);

        if (firstMissing) {
            if (map) {
                const target = L.latLng(firstMissing.lat, firstMissing.lng);
                const nextZoom = Math.max(map.getZoom(), 16);

                map.flyTo(target, nextZoom, {
                    animate: true,
                    duration: 0.6,
                });
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
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: '100vh',
            }}
        >
            {/* MENU PANEL */}
            <PinMenu
                isAddMode={isAddMode}
                setIsAddMode={setIsAddMode}
                sendError={sendError}
                isSending={isSending}
                maintenanceCosts={maintenanceCosts}
                metroUsage={metroUsage}
                onDeletePins={() => {
                    clearPins();
                    setSelectedPinId(null);
                    setForceEditSelectedPin(false);
                    setMetroUsage(null);
                    setSendError(null);
                }}
                onSendPins={handleSendPins}
            />

            {/* MAP CONTAINER */}
            <div
                ref={mapContainerRef}
                style={{
                    width: '100%',
                    height: '100%',
                }}
            />

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
    );
}