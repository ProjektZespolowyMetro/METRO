import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import PinOverlay from '../components/PinOverlay';
import PinMenu from '../components/unused/PinMenu';
import RoutesLayer from '../hooks/RoutesLayer';

import { usePins } from '../contexts/PinsContext';
import { useMapInit } from '../hooks/InitMap';
import { usePinSync } from '../hooks/Pins';

import {
    sendPinsToBackend,
    calculateDailyProfitSummary,
} from '../services/SendPinsToApi';
import { submitScore } from '../services/AuthAndRankingApi';

const TICKET_PRICE_USD = 1.5;

type Props = {
    authToken: string;
    currentUsername: string;
    onLogout: () => void;
};

export default function MainMap({ authToken, currentUsername, onLogout }: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    const [maintenanceCosts, setMaintenanceCosts] = useState<any>(null);
    const [metroUsage, setMetroUsage] = useState<any>(null);
    const [totalLengthMeters, setTotalLengthMeters] = useState<number | null>(null);

    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const [forceEditSelectedPin, setForceEditSelectedPin] = useState(false);

    const [sendError, setSendError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isSavingScore, setIsSavingScore] = useState(false);
    const [scoreMessage, setScoreMessage] = useState<string | null>(null);
    const [rankingRefreshKey, setRankingRefreshKey] = useState(0);

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
            setSendError(null);
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
            setTotalLengthMeters(data.total_length_meters ?? null);
            setScoreMessage(null);
        } catch (e) {
            setSendError(
                e instanceof Error ? e.message : 'Nie udało się wysłać pinów.'
            );
        } finally {
            setIsSending(false);
        }
    };

    const canSaveScore = Boolean(maintenanceCosts) && Boolean(metroUsage);

    const handleSaveScore = async () => {
        if (!authToken) {
            setScoreMessage('Zaloguj się, aby zapisać wynik.');
            return;
        }

        const profit = calculateDailyProfitSummary(
            metroUsage,
            maintenanceCosts,
            TICKET_PRICE_USD
        );
        if (!profit) {
            setScoreMessage('Najpierw policz linię (Send pins).');
            return;
        }

        try {
            setIsSavingScore(true);
            setScoreMessage(null);

            const result = await submitScore(authToken, {
                line_name: `Linia ${pins.length} stacji`,
                daily_profit_usd: profit.dailyProfitUsd,
                total_length_meters: totalLengthMeters ?? 0,
                num_stations: pins.length,
                train_frequency_minutes: maintenanceCosts?.frequency_minutes ?? 5,
            });

            setScoreMessage(`Wynik zapisany: ${result.line_name}.`);
            setRankingRefreshKey((v) => v + 1);
        } catch (err) {
            setScoreMessage(
                err instanceof Error
                    ? err.message
                    : 'Nie udało się zapisać wyniku.'
            );
        } finally {
            setIsSavingScore(false);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <PinMenu
                sendError={sendError}
                isSending={isSending}
                maintenanceCosts={maintenanceCosts}
                metroUsage={metroUsage}
                canSaveScore={canSaveScore}
                isSavingScore={isSavingScore}
                scoreMessage={scoreMessage}
                rankingRefreshKey={rankingRefreshKey}
                currentUsername={currentUsername}
                onLogout={onLogout}
                onDeletePins={() => {
                    clearPins();
                    setSelectedPinId(null);
                    setForceEditSelectedPin(false);
                    setMetroUsage(null);
                    setSendError(null);
                    setTotalLengthMeters(null);
                    setScoreMessage(null);
                }}
                onSendPins={handleSendPins}
                onSaveScore={handleSaveScore}
            />

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
