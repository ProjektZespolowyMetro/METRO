import React, { useMemo } from 'react';

type MaintenanceCosts = {
    frequency_minutes: number;
    frequency_label: string;
    daily_cost_usd: number;
    monthly_cost_usd: number;
    yearly_cost_usd: number;
};

type MetroUsageByPinNumber = Record<number, number[]>;

type Props = {
    maintenanceCosts: MaintenanceCosts | null | undefined;
    metroUsage: MetroUsageByPinNumber | null | undefined;
    ticketPriceUsd?: number;
};

function formatUsd(n: number = 0) {
    return n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    });
}

export default function MetroFinanceTable({
    maintenanceCosts,
    metroUsage,
    ticketPriceUsd = 2.5,
}: Props) {
    const totalDailyRides = useMemo(() => {
        if (!metroUsage) return null;

        let sum = 0;
        for (const key of Object.keys(metroUsage)) {
            const arr = metroUsage[Number(key)];
            if (!Array.isArray(arr)) continue;
            for (const v of arr) sum += Number(v) || 0;
        }
        return sum;
    }, [metroUsage]);

    const revenue = useMemo(() => {
        if (totalDailyRides === null) return null;
        const daily = totalDailyRides * ticketPriceUsd;
        return { daily, monthly: daily * 30, yearly: daily * 365 };
    }, [totalDailyRides, ticketPriceUsd]);

    if (!maintenanceCosts) {
        return (
            <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
                Kliknij „Send pins”, żeby zobaczyć koszty i przychody.
            </div>
        );
    }

    const profit = revenue
        ? {
              daily: revenue.daily - maintenanceCosts.daily_cost_usd,
              monthly: revenue.monthly - maintenanceCosts.monthly_cost_usd,
              yearly: revenue.yearly - maintenanceCosts.yearly_cost_usd,
          }
        : null;

    // Panel jest wąski (340px), więc defaultowo robimy układ "narrow".
    // Jeśli kiedyś użyjesz tego komponentu poza panelem, możesz dodać props `variant`.
    const isNarrow = true;

    const headerRow: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10,
        fontSize: 11,
        color: '#6b7280',
        marginTop: 8,
    };

    const cardRow: React.CSSProperties = {
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 10,
        background: 'rgba(255,255,255,0.85)',
    };

    return (
        <div
            style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                background: 'rgba(255,255,255,0.9)',
                boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
            }}
        >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
                Koszty i przychody metra
            </div>

            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.3 }}>
                Częstotliwość:{' '}
                <strong>{maintenanceCosts.frequency_label}</strong>
                {' • '}
                Cena biletu: <strong>{formatUsd(ticketPriceUsd)}</strong>
            </div>

            {isNarrow ? (
                <>
                    <div style={headerRow}>
                        <div style={{ textAlign: 'right', fontWeight: 700 }}>
                            Dzień
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 700 }}>
                            Miesiąc
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 700 }}>
                            Rok
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                        <div style={cardRow}>
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    marginBottom: 6,
                                }}
                            >
                                Koszt utrzymania
                            </div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: 10,
                                }}
                            >
                                <div
                                    style={{ textAlign: 'right', fontSize: 12 }}
                                >
                                    {formatUsd(maintenanceCosts.daily_cost_usd)}
                                </div>
                                <div
                                    style={{ textAlign: 'right', fontSize: 12 }}
                                >
                                    {formatUsd(
                                        maintenanceCosts.monthly_cost_usd
                                    )}
                                </div>
                                <div
                                    style={{ textAlign: 'right', fontSize: 12 }}
                                >
                                    {formatUsd(
                                        maintenanceCosts.yearly_cost_usd
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={cardRow}>
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    marginBottom: 6,
                                }}
                            >
                                Przychód z biletów
                            </div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: 10,
                                }}
                            >
                                <div
                                    style={{ textAlign: 'right', fontSize: 12 }}
                                >
                                    {revenue ? formatUsd(revenue.daily) : '—'}
                                </div>
                                <div
                                    style={{ textAlign: 'right', fontSize: 12 }}
                                >
                                    {revenue ? formatUsd(revenue.monthly) : '—'}
                                </div>
                                <div
                                    style={{ textAlign: 'right', fontSize: 12 }}
                                >
                                    {revenue ? formatUsd(revenue.yearly) : '—'}
                                </div>
                            </div>
                        </div>

                        <div style={cardRow}>
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 900,
                                    marginBottom: 6,
                                }}
                            >
                                Zysk/Strata
                            </div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: 10,
                                }}
                            >
                                <div
                                    style={{
                                        textAlign: 'right',
                                        fontSize: 12,
                                        fontWeight: 900,
                                    }}
                                >
                                    {profit ? formatUsd(profit.daily) : '—'}
                                </div>
                                <div
                                    style={{
                                        textAlign: 'right',
                                        fontSize: 12,
                                        fontWeight: 900,
                                    }}
                                >
                                    {profit ? formatUsd(profit.monthly) : '—'}
                                </div>
                                <div
                                    style={{
                                        textAlign: 'right',
                                        fontSize: 12,
                                        fontWeight: 900,
                                    }}
                                >
                                    {profit ? formatUsd(profit.yearly) : '—'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {totalDailyRides !== null && (
                        <div
                            style={{
                                marginTop: 10,
                                fontSize: 11,
                                color: '#6b7280',
                            }}
                        >
                            Szacowana liczba przejazdów/dzień:{' '}
                            <strong>
                                {totalDailyRides.toLocaleString('pl-PL')}
                            </strong>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
