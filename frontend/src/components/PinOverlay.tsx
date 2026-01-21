import React, { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { Pin } from '../contexts/PinsContext';
import { MetroUsageByPinNumber } from '../services/SendPinsToApi';
import { createPortal } from 'react-dom';

type Props = {
    map: L.Map;
    pin: Pin;

    pins: Pin[];
    updatePin: (updatedPin: Pin) => void;
    removePin: (id: string) => void;

    metroUsage: MetroUsageByPinNumber | null;

    /** pozwala z zewnątrz (np. z Send pins) wymusić wejście w tryb edycji */
    forceEdit?: boolean;
    onForceEditConsumed?: () => void;

    onClose: () => void;
};

function normalize24(arr?: number[]) {
    if (!arr) return null;
    if (arr.length === 24) return arr;
    return Array.from({ length: 24 }, (_, i) => arr[i] ?? 0);
}

function formatNumber(n: number) {
    // proste formatowanie: 12 345 zamiast 12345
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function PinOverlay({
                                       map,
                                       pin,
                                       pins,
                                       updatePin,
                                       removePin,
                                       metroUsage,
                                       forceEdit,
                                       onForceEditConsumed,
                                       onClose,
                                   }: Props) {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

    const [expandedUsage, setExpandedUsage] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [draftNumber, setDraftNumber] = useState<string>(
        pin.number?.toString() ?? ''
    );
    const [draftName, setDraftName] = useState<string>(pin.name ?? '');

    // aktualizuj drafty gdy zmieni się pin
    useEffect(() => {
        setExpandedUsage(false);
        setEditMode(false);
        setDraftNumber(pin.number?.toString() ?? '');
        setDraftName(pin.name ?? '');
    }, [pin.id]);

    // wymuszona edycja z zewnątrz (np. po blokadzie Send pins)
    useEffect(() => {
        if (forceEdit) {
            setEditMode(true);
            setExpandedUsage(false);
            onForceEditConsumed?.();
        }
    }, [forceEdit, onForceEditConsumed]);

    const hourly = useMemo(() => {
        const n = pin.number;
        if (!n || !metroUsage) return null;
        return normalize24(metroUsage[n]);
    }, [pin.number, metroUsage]);

    const maxVal = useMemo(() => {
        if (!hourly) return 0;
        return Math.max(1, ...hourly);
    }, [hourly]);

    const scaleMax = useMemo(() => {
        if (!hourly) return 0;
        const raw = Math.max(1, ...hourly);
        const padded = Math.ceil(raw * 1.1);
        return Math.max(padded, raw + 1); // gwarancja zapasu nawet dla małych liczb
    }, [hourly]);
    useEffect(() => {
        const update = () => {
            const p = map.latLngToContainerPoint(L.latLng(pin.lat, pin.lng));
            setPos({ x: p.x, y: p.y });
        };

        update();
        map.on('move', update);
        map.on('zoom', update);

        return () => {
            map.off('move', update);
            map.off('zoom', update);
        };
    }, [map, pin.lat, pin.lng]);

    if (!pos) return null;

    const save = () => {
        const n = Number(draftNumber);

        if (!Number.isInteger(n) || n <= 0) {
            // zostajemy w editMode; możesz tu dodać czerwony tekst walidacji, jeśli chcesz
            return;
        }

        // duplikat -> usuwamy stary pin (B)
        const existing = pins.find((p) => p.number === n && p.id !== pin.id);
        if (existing) {
            removePin(existing.id);
        }

        updatePin({
            ...pin,
            number: n,
            name: draftName.trim() === '' ? undefined : draftName.trim(),
        });

        setEditMode(false);
    };

    return createPortal(
        <div
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, calc(-100% - 14px))',
                zIndex: 2000,
                pointerEvents: 'auto',
            }}
        >
            {/* DYMek - zawsze widoczny */}
            <div
                style={{
                    background: '#111827',
                    color: 'white',
                    borderRadius: 10,
                    padding: '6px 10px',
                    fontSize: 12,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    maxWidth: 360,
                }}
            >
                <strong style={{ whiteSpace: 'nowrap' }}>
                    {pin.name ?? 'Pin'}
                </strong>

                <span style={{ opacity: 0.9, whiteSpace: 'nowrap' }}>
                    #{pin.number ?? '—'}
                </span>

                {pin.number === undefined && (
                    <span
                        style={{
                            marginLeft: 6,
                            padding: '2px 6px',
                            borderRadius: 999,
                            background: '#b91c1c',
                            fontSize: 10,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Brak numeru
                    </span>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button
                        onClick={() => {
                            setEditMode((v) => !v);
                            setExpandedUsage(false);
                        }}
                        style={{
                            background: 'rgba(255,255,255,0.12)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            color: 'white',
                            borderRadius: 8,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: 12,
                        }}
                    >
                        Edytuj
                    </button>

                    <button
                        onClick={() => {
                            setExpandedUsage((v) => !v);
                            setEditMode(false);
                        }}
                        style={{
                            background: expandedUsage
                                ? 'rgba(37,99,235,0.95)'
                                : 'rgba(255,255,255,0.12)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            color: 'white',
                            borderRadius: 8,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: 12,
                            opacity: pin.number ? 1 : 0.6,
                        }}
                        disabled={!pin.number}
                        title={
                            !pin.number
                                ? 'Nadaj numer pinowi, aby wyświetlić 24h'
                                : 'Pokaż/ukryj 24h'
                        }
                    >
                        24h
                    </button>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            opacity: 0.9,
                            cursor: 'pointer',
                            fontSize: 14,
                            lineHeight: 1,
                        }}
                        aria-label="Zamknij"
                        title="Zamknij"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* PANEL EDYCJI */}
            {editMode && (
                <div
                    style={{
                        marginTop: 8,
                        background: 'white',
                        borderRadius: 12,
                        padding: 10,
                        width: 360,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
                        border: '1px solid #e5e7eb',
                    }}
                >
                    <div
                        style={{
                            fontSize: 12,
                            color: '#374151',
                            marginBottom: 8,
                            fontWeight: 600,
                        }}
                    >
                        Edycja pina
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 2fr',
                            gap: 8,
                            alignItems: 'center',
                        }}
                    >
                        <label style={{ fontSize: 12, color: '#374151' }}>
                            Numer*
                        </label>
                        <input
                            value={draftNumber}
                            onChange={(e) => setDraftNumber(e.target.value)}
                            type="number"
                            min={1}
                            step={1}
                            style={{
                                border: '1px solid #d1d5db',
                                borderRadius: 8,
                                padding: '6px 8px',
                                fontSize: 12,
                            }}
                            placeholder="np. 1"
                        />

                        <label style={{ fontSize: 12, color: '#374151' }}>
                            Nazwa
                        </label>
                        <input
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            style={{
                                border: '1px solid #d1d5db',
                                borderRadius: 8,
                                padding: '6px 8px',
                                fontSize: 12,
                            }}
                            placeholder="np. Centrum"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                            onClick={save}
                            style={{
                                background: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: 10,
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: 12,
                            }}
                        >
                            Zapisz
                        </button>
                        <button
                            onClick={() => {
                                setDraftNumber(pin.number?.toString() ?? '');
                                setDraftName(pin.name ?? '');
                                setEditMode(false);
                            }}
                            style={{
                                background: 'white',
                                color: '#111827',
                                border: '1px solid #d1d5db',
                                borderRadius: 10,
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: 12,
                            }}
                        >
                            Anuluj
                        </button>

                        <button
                            onClick={() => removePin(pin.id)}
                            style={{
                                marginLeft: 'auto',
                                background: '#b91c1c',
                                color: 'white',
                                border: 'none',
                                borderRadius: 10,
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: 12,
                            }}
                        >
                            Usuń pin
                        </button>
                    </div>

                    <div
                        style={{
                            marginTop: 8,
                            fontSize: 11,
                            color: '#6b7280',
                        }}
                    >
                        * Numer jest wymagany do wysłania pinów do backendu.
                    </div>
                </div>
            )}

            {/* PANEL 24h */}
            {expandedUsage && (
                <div
                    style={{
                        marginTop: 8,
                        background: 'white',
                        borderRadius: 12,
                        padding: 10,
                        width: 360,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
                        border: '1px solid #e5e7eb',
                    }}
                >
                    {!hourly ? (
                        <div style={{ fontSize: 12, color: '#374151' }}>
                            Brak danych 24h dla tego pina. Kliknij „Send pins”.
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: '#374151',
                                    marginBottom: 8,
                                }}
                            >
                                Profil godzinowy (0–23)
                            </div>

                            {/* Skala + wykres */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '46px 1fr',
                                    gap: 8,
                                }}
                            >
                                {/* Skala Y */}
                                <div
                                    style={{
                                        position: 'relative',
                                        height: 120,
                                        fontSize: 10,
                                        color: '#6b7280',
                                    }}
                                >
                                    {[1, 0.75, 0.5, 0.25, 0].map((t) => {
                                        const value = Math.round(scaleMax * t);
                                        return (
                                            <div
                                                key={t}
                                                style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: `${(1 - t) * 100}%`,
                                                    transform:
                                                        'translateY(-50%)',
                                                    width: '100%',
                                                    textAlign: 'right',
                                                    paddingRight: 6,
                                                    boxSizing: 'border-box',
                                                }}
                                            >
                                                {formatNumber(value)}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Wykres z liniami siatki */}
                                <div style={{ position: 'relative' }}>
                                    {[1, 0.75, 0.5, 0.25, 0].map((t) => (
                                        <div
                                            key={t}
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                right: 0,
                                                top: `${(1 - t) * 100}%`,
                                                height: 1,
                                                background:
                                                    t === 0
                                                        ? '#d1d5db'
                                                        : '#eef2ff',
                                                zIndex: 0,
                                            }}
                                        />
                                    ))}

                                    <div
                                        style={{
                                            position: 'relative',
                                            zIndex: 1,
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(24, 1fr)',
                                            gap: 2,
                                            alignItems: 'end',
                                            height: 120,
                                        }}
                                    >
                                        {hourly.map((v, h) => (
                                            <div
                                                key={h}
                                                title={`${h}:00  •  ${formatNumber(v)}`}
                                                style={{
                                                    height: `${Math.round((v / scaleMax) * 100)}%`,
                                                    background: '#2563eb',
                                                    borderRadius: 2,
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Etykiety godzin (co 2h), wyrównane do wykresu */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '46px 1fr',
                                    gap: 8,
                                    marginTop: 8,
                                }}
                            >
                                <div />
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns:
                                            'repeat(12, 1fr)',
                                        gap: 4,
                                        fontSize: 10,
                                        color: '#6b7280',
                                    }}
                                >
                                    {Array.from(
                                        { length: 12 },
                                        (_, i) => i * 2
                                    ).map((h) => (
                                        <div
                                            key={h}
                                            style={{ textAlign: 'center' }}
                                        >
                                            {h}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>,
    map.getContainer()
    );
}