import React, { useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import SendPinsButton from '../components/SendPinsButton';
import DeletePinsButton from '../components/DeletePinsButton';
import { usePins } from '../contexts/PinsContext';
import { useMapInit } from '../hooks/InitMap';
import { usePinSync } from '../hooks/Pins';
import { sendPinsToBackend } from '../services/SendPinsToApi';

export default function MainMap() {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    const { pins, addPin, updatePin, removePin, clearPins } = usePins();
    const map = useMapInit(mapContainerRef);

    usePinSync({
        map,
        pins,
        addPin,
        updatePin,
        removePin,
    });

    return (
        <>
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
                <div
                    style={{
                        pointerEvents: 'auto',
                        marginBottom: '50px', // doesnt work when styled inside button for some reason
                    }}
                >
                    <SendPinsButton onClick={() => sendPinsToBackend(pins)} />
                </div>
                <div style={{ pointerEvents: 'auto' }}>
                    <DeletePinsButton onClick={clearPins} />
                </div>
            </div>

            <div
                ref={mapContainerRef}
                style={{ width: '100%', height: '100vh' }}
            />
        </>
    );
}
