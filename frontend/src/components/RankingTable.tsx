import React, { useEffect, useState } from 'react';
import { getRanking, RankingEntry } from '../services/AuthAndRankingApi';

type Props = {
    refreshKey: number;
};

function formatUsd(n: number) {
    return n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    });
}

export default function RankingTable({ refreshKey }: Props) {
    const [entries, setEntries] = useState<RankingEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getRanking(10);
                if (!isCancelled) setEntries(data);
            } catch (err) {
                if (!isCancelled) {
                    setError(err instanceof Error ? err.message : 'Nie udało się pobrać rankingu.');
                }
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        load();
        return () => {
            isCancelled = true;
        };
    }, [refreshKey]);

    return (
        <div
            style={{
                marginTop: 10,
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 10,
                background: 'rgba(255,255,255,0.75)',
            }}
        >
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Ranking TOP 10</div>

            {loading && <div style={{ fontSize: 11, color: '#6b7280' }}>Ładowanie rankingu...</div>}
            {error && <div style={{ fontSize: 11, color: '#991b1b' }}>{error}</div>}

            {!loading && !error && entries.length === 0 && (
                <div style={{ fontSize: 11, color: '#6b7280' }}>Brak zapisanych wyników.</div>
            )}

            {!loading && !error && entries.length > 0 && (
                <div style={{ display: 'grid', gap: 6 }}>
                    {entries.map((entry) => (
                        <div
                            key={`${entry.username}-${entry.rank}-${entry.created_at}`}
                            style={{
                                borderRadius: 10,
                                border: '1px solid #e5e7eb',
                                background: '#ffffff',
                                padding: '6px 8px',
                                fontSize: 11,
                                display: 'grid',
                                gridTemplateColumns: '26px 1fr auto',
                                gap: 6,
                                alignItems: 'center',
                            }}
                        >
                            <strong>#{entry.rank}</strong>
                            <div>
                                <div style={{ fontWeight: 700 }}>{entry.username}</div>
                                <div style={{ color: '#6b7280' }}>{entry.line_name}</div>
                            </div>
                            <strong>{formatUsd(entry.daily_profit_usd)}/d</strong>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
