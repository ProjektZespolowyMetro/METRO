import MetroFinanceTable from './MetroFinanceTable';
import SendPinsButton from './SendPinsButton';
import DeletePinsButton from './DeletePinsButton';
import RankingTable from './RankingTable';

type Props = {
    sendError: string | null;
    isSending: boolean;

    maintenanceCosts: any;
    metroUsage: any;
    canSaveScore: boolean;
    isSavingScore: boolean;
    scoreMessage: string | null;
    rankingRefreshKey: number;
    currentUsername: string;
    onLogout: () => void;

    onDeletePins: () => void;
    onSendPins: () => void;
    onSaveScore: () => void;
};

export default function PinMenu({
    sendError,
    isSending,
    maintenanceCosts,
    metroUsage,
    canSaveScore,
    isSavingScore,
    scoreMessage,
    rankingRefreshKey,
    currentUsername,
    onLogout,
    onDeletePins,
    onSendPins,
    onSaveScore,
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
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
                    <div><strong>LPM</strong>: wybierz pinezkę</div>
                    <div><strong>PPM (puste miejsce)</strong>: nowy tymczasowy pin</div>
                    <div><strong>PPM (na pinie)</strong>: edytuj numer/nazwę</div>
                    <div><strong>Drag</strong>: przesuń pinezkę</div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            background: 'rgba(255,255,255,0.75)',
                            padding: '8px 10px',
                        }}
                    >
                        <div style={{ fontSize: 12, color: '#111827' }}>
                            Gracz: <strong>{currentUsername}</strong>
                        </div>
                        <button
                            onClick={onLogout}
                            style={{
                                borderRadius: 10,
                                border: '1px solid #d1d5db',
                                background: '#f3f4f6',
                                color: '#111827',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '5px 8px',
                                fontSize: 11,
                            }}
                        >
                            Wyloguj
                        </button>
                    </div>

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

                        <button
                            onClick={onSaveScore}
                            disabled={!canSaveScore || isSavingScore}
                            style={{
                                borderRadius: 10,
                                border: '1px solid #d1d5db',
                                background: canSaveScore ? '#0f766e' : '#d1d5db',
                                color: 'white',
                                fontWeight: 700,
                                cursor: canSaveScore ? 'pointer' : 'not-allowed',
                                padding: '8px 10px',
                                width: '100%',
                            }}
                        >
                            {isSavingScore ? 'Zapisywanie...' : 'Zapisz wynik do rankingu'}
                        </button>

                        {scoreMessage && (
                            <div style={{ fontSize: 11, color: '#374151', textAlign: 'center' }}>
                                {scoreMessage}
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

                    <RankingTable refreshKey={rankingRefreshKey} />
                </div>
            </div>
        </div>
    );
}