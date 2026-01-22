import React, { useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import MetroFinanceTable from '../components/MetroFinanceTable';
import type { MaintenanceCosts } from '../services/SendPinsToApi';
import SendPinsButton from '../components/SendPinsButton';
import DeletePinsButton from '../components/DeletePinsButton';
import { usePins } from '../contexts/PinsContext';
import { useMapInit } from '../hooks/InitMap';
import { usePinSync } from '../hooks/Pins';
import L from 'leaflet';
import {
    sendPinsToBackend,
    MetroUsageByPinNumber,
} from '../services/SendPinsToApi';
import PinOverlay from '../components/PinOverlay';

export default function MainMap() {
    const [isAddMode, setIsAddMode] = useState(true);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const [constructionCosts, setConstructionCosts] = useState<any | null>(null);
    const { pins, addPin, updatePin, removePin, clearPins } = usePins();
    const map = useMapInit(mapContainerRef);
    const [maintenanceCosts, setMaintenanceCosts] = useState<any>(null);
    const [metroUsage, setMetroUsage] = useState<any>(null);

    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const [forceEditSelectedPin, setForceEditSelectedPin] = useState(false);

    const [sendError, setSendError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    usePinSync({
        map,
        pins,
        addPin,
        updatePin,
        removePin,
        selectedPinId, // <-- do wyróżnienia markera (patrz hooks/Pins.tsx)
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

        // blokada: każdy pin musi mieć numer
        const firstMissing = pins.find((p) => p.number === undefined);
        if (firstMissing) {
            // 1) przeskok widoku do pina
            if (map) {
                const target = L.latLng(firstMissing.lat, firstMissing.lng);

                // flyTo jest "ładniejsze" (animacja). setView jest natychmiastowe.
                const nextZoom = Math.max(map.getZoom(), 16); // nie oddalaj, tylko ewentualnie przybliż
                map.flyTo(target, nextZoom, { animate: true, duration: 0.6 });
            }

            // 2) wybór + wymuszenie edycji
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
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            {/* PANEL UI */}
            <div
                style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 1000,
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        pointerEvents: 'auto',
                        width: 340,
                        background: 'rgba(255,255,255,0.92)',
                        border: '1px solid #e5e7eb',
                        borderRadius: 14,
                        padding: 12,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                        backdropFilter: 'blur(6px)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: '#111827',
                            }}
                        >
                            METRO
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                            planner
                        </div>
                    </div>

                    <div
                        style={{
                            fontSize: 12,
                            color: '#374151',
                            lineHeight: 1.35,
                            marginBottom: 10,
                        }}
                    >
                        <div>
                            <strong>LPM</strong>: wybierz pinezkę
                        </div>
                        <div>
                            <strong>PPM</strong>: edytuj numer/nazwę
                        </div>
                        <div>
                            <strong>Drag</strong>: przesuń pinezkę
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '8px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            background: 'rgba(255,255,255,0.7)',
                            marginBottom: 10,
                        }}
                    >
                        <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>
                            Tryb dodawania pinów
                        </div>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsAddMode((v) => !v);
                            }}
                            style={{
                                padding: '6px 10px',
                                borderRadius: 10,
                                border: '1px solid #e5e7eb',
                                background: isAddMode ? '#16a34a' : '#f3f4f6',
                                color: isAddMode ? 'white' : '#111827',
                                fontWeight: 700,
                                cursor: 'pointer',
                                minWidth: 56,
                            }}
                            title="Gdy OFF, kliknięcie mapy nie doda pinezki."
                        >
                            {isAddMode ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    {/* Przyciski + komunikaty */}
                    <div style={{ display: 'grid', gap: 10 }}>
                        {sendError && (
                            <div
                                style={{
                                    background: 'rgba(255,255,255,0.95)',
                                    border: '1px solid #fecaca',
                                    color: '#991b1b',
                                    padding: '10px 12px',
                                    borderRadius: 12,
                                    fontSize: 12,
                                    boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                                    lineHeight: 1.35,
                                    overflowWrap: 'anywhere',
                                    textAlign: 'center',
                                }}
                            >
                                {sendError}
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
                            <DeletePinsButton
                                onClick={() => {
                                    clearPins();
                                    setSelectedPinId(null);
                                    setForceEditSelectedPin(false);
                                    setMetroUsage(null);
                                    setSendError(null);
                                }}
                            />

                            <div style={{ opacity: isSending ? 0.75 : 1, pointerEvents: isSending ? 'none' : 'auto' }}>
                                <SendPinsButton onClick={handleSendPins} />
                            </div>

                            {isSending && (
                                <div style={{ fontSize: 12, color: '#1f2937' }}>
                                    Liczenie… czekaj
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <MetroFinanceTable
                                maintenanceCosts={maintenanceCosts}
                                metroUsage={metroUsage}
                                ticketPriceUsd={1.5}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* MAPA */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

            {/* OVERLAY wybranego pina */}
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