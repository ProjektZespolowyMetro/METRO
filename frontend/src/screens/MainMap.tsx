import React, { useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import SendPinsButton from '../components/SendPinsButton';
import DeletePinsButton from '../components/DeletePinsButton';
import { usePins } from '../contexts/PinsContext';
import { useMapInit } from '../hooks/InitMap';
import { usePinSync } from '../hooks/Pins';
import { sendPinsToBackend, MetroUsageByPinNumber } from '../services/SendPinsToApi';
import PinOverlay from '../components/PinOverlay';

export default function MainMap() {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    const { pins, addPin, updatePin, removePin, clearPins } = usePins();
    const map = useMapInit(mapContainerRef);

    const [metroUsage, setMetroUsage] = useState<MetroUsageByPinNumber | null>(null);

    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const [forceEditSelectedPin, setForceEditSelectedPin] = useState(false);

    const [sendError, setSendError] = useState<string | null>(null);

    usePinSync({
        map,
        pins,
        addPin,
        updatePin,
        removePin,
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

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div
                style={{
                    position: 'absolute',
                    top: '0px',
                    right: '10px',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    pointerEvents: 'none',
                }}
            >
                <div style={{ pointerEvents: 'auto', marginBottom: '50px' }}>
                    <SendPinsButton
                        onClick={async () => {
                            // blokada: każdy pin musi mieć numer
                            const firstMissing = pins.find((p) => p.number === undefined);
                            if (firstMissing) {
                                setSelectedPinId(firstMissing.id);
                                setForceEditSelectedPin(true);
                                setSendError('Nadaj numer każdej pinezce przed wysłaniem (PPM lub „Edytuj” w dymku).');
                                return;
                            }

                            try {
                                const data = await sendPinsToBackend(pins);
                                setMetroUsage(data.metro_usage ?? null);
                                setSendError(null);
                            } catch (e) {
                                setSendError(
                                    e instanceof Error ? e.message : 'Nie udało się wysłać pinów.'
                                );
                            }
                        }}
                    />
                    {sendError && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 'calc(100% + 6px)',
                                right: 0,
                                width: 320,
                                background: 'rgba(255,255,255,0.92)',
                                border: '1px solid #fecaca',
                                color: '#991b1b',
                                padding: '8px 10px',
                                borderRadius: 10,
                                fontSize: 12,
                                boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                            }}
                        >
                            {sendError}
                        </div>
                    )}
                </div>

                <div style={{ pointerEvents: 'auto' }}>
                    <DeletePinsButton
                        onClick={() => {
                            clearPins();
                            setSelectedPinId(null);
                            setForceEditSelectedPin(false);
                            setMetroUsage(null);
                            setSendError(null);
                        }}
                    />
                </div>
            </div>

            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

            {map && selectedPin && (
                <PinOverlay
                    map={map}
                    pin={selectedPin}
                    pins={pins}
                    updatePin={updatePin}
                    removePin={removePin}
                    metroUsage={metroUsage}
                    forceEdit={forceEditSelectedPin}
                    onForceEditConsumed={() => setForceEditSelectedPin(false)}
                    onClose={() => {
                        setSelectedPinId(null);
                        setForceEditSelectedPin(false);
                    }}
                />
            )}
        </div>
    );
}