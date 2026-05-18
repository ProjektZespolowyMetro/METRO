import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

import PinOverlay from '../components/PinOverlay';
import RoutesLayer from '../hooks/RoutesLayer';

import { usePins } from '../contexts/PinsContext';
import { useMapInit } from '../hooks/InitMap';
import { usePinSync } from '../hooks/Pins';


type Props = {
    authToken: string;
    currentUsername: string;
    onLogout: () => void;
};

export default function MainMap(_props: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const [forceEditSelectedPin, setForceEditSelectedPin] = useState(false);

    const { pins, addPin, updatePin, removePin, activeTool, metroUsage } =
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
        },
        onRequestEditPinId: (id) => {
            setSelectedPinId(id);
            setForceEditSelectedPin(true);
        },
        onMapBlankRightClick: (lat, lng) => {
            const existingDraft = pins.find((p) => p.isDraft);
            if (existingDraft) {
                removePin(existingDraft.id);
            }

            const draftPin = {
                id: crypto.randomUUID(),
                lat,
                lng,
                isDraft: true,
            };

            addPin(draftPin);
            setSelectedPinId(draftPin.id);
            setForceEditSelectedPin(true);
        },
        onMapBlankLeftClick: (eventTarget) => {
            const targetEl = eventTarget instanceof Element ? eventTarget : null;

            if (
                targetEl?.closest('[data-pin-overlay-root="true"]') ||
                targetEl?.closest('[data-pin-overlay-panel="true"]')
            ) {
                return;
            }

            const selected = pins.find((p) => p.id === selectedPinId) ?? null;

            if (
                selected?.isDraft &&
                selected.number === undefined &&
                !(selected.name && selected.name.trim())
            ) {
                removePin(selected.id);
            }

            setSelectedPinId(null);
            setForceEditSelectedPin(false);
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

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

            <RoutesLayer map={map} />

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
                        if (
                            selectedPin.isDraft &&
                            selectedPin.number === undefined &&
                            !(selectedPin.name && selectedPin.name.trim())
                        ) {
                            removePin(selectedPin.id);
                        }

                        setSelectedPinId(null);
                        setForceEditSelectedPin(false);
                    }}
                />
            )}
        </div>
    );
}
