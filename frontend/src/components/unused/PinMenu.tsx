import MetroFinanceTable from './MetroFinanceTable';
import SendPinsButton from '../SendPinsButton';
import DeletePinsButton from '../DeletePinsButton';
import React from 'react';

type Props = {
    isAddMode: boolean;
    setIsAddMode: React.Dispatch<React.SetStateAction<boolean>>;

    sendError: string | null;
    isSending: boolean;

    maintenanceCosts: any;
    metroUsage: any;

    onDeletePins: () => void;
    onSendPins: () => void;
};

export default function PinMenu({
    isAddMode,
    setIsAddMode,
    sendError,
    isSending,
    maintenanceCosts,
    metroUsage,
    onDeletePins,
    onSendPins,
}: Props) {
    return (
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
                    <div
                        style={{
                            fontSize: 12,
                            color: '#111827',
                            fontWeight: 600,
                        }}
                    >
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
                    >
                        {isAddMode ? 'ON' : 'OFF'}
                    </button>
                </div>

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

                    <div
                        style={{
                            display: 'grid',
                            gap: 10,
                            justifyItems: 'center',
                        }}
                    >
                        <DeletePinsButton onClick={onDeletePins} />

                        <div
                            style={{
                                opacity: isSending ? 0.75 : 1,
                                pointerEvents: isSending ? 'none' : 'auto',
                            }}
                        >
                            <SendPinsButton onClick={onSendPins} />
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
    );
}
