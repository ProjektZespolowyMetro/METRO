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
    maintenanceCosts: MaintenanceCosts | null;
    metroUsage: MetroUsageByPinNumber | null;
    ticketPriceUsd?: number;
};

function formatUsd(n: number) {
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

    if (!maintenanceCosts) return null;

    const profit = revenue
        ? {
            daily: revenue.daily - maintenanceCosts.daily_cost_usd,
            monthly: revenue.monthly - maintenanceCosts.monthly_cost_usd,
            yearly: revenue.yearly - maintenanceCosts.yearly_cost_usd,
        }
        : null;

    const row: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid #e5e7eb',
        fontSize: 12,
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
                maxWidth: 760,
                width: 'min(760px, 92vw)',
            }}
        >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
                Koszty i przychody metra
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                Częstotliwość: <strong>{maintenanceCosts.frequency_label}</strong>
                {' • '}
                Cena biletu: <strong>{formatUsd(ticketPriceUsd)}</strong>
            </div>

            <div style={{ ...row, fontWeight: 800 }}>
                <div>Pozycja</div>
                <div style={{ textAlign: 'right' }}>Dzień</div>
                <div style={{ textAlign: 'right' }}>Miesiąc</div>
                <div style={{ textAlign: 'right' }}>Rok</div>
            </div>

            <div style={row}>
                <div style={{ color: '#6b7280' }}>Koszt utrzymania</div>
                <div style={{ textAlign: 'right' }}>
                    {formatUsd(maintenanceCosts.daily_cost_usd)}
                </div>
                <div style={{ textAlign: 'right' }}>
                    {formatUsd(maintenanceCosts.monthly_cost_usd)}
                </div>
                <div style={{ textAlign: 'right' }}>
                    {formatUsd(maintenanceCosts.yearly_cost_usd)}
                </div>
            </div>

            <div style={row}>
                <div style={{ color: '#6b7280' }}>Przychód z biletów</div>
                <div style={{ textAlign: 'right' }}>
                    {revenue ? formatUsd(revenue.daily) : '—'}
                </div>
                <div style={{ textAlign: 'right' }}>
                    {revenue ? formatUsd(revenue.monthly) : '—'}
                </div>
                <div style={{ textAlign: 'right' }}>
                    {revenue ? formatUsd(revenue.yearly) : '—'}
                </div>
            </div>

            <div style={{ ...row, borderBottom: 'none' }}>
                <div style={{ fontWeight: 800 }}>Zysk/Strata</div>
                <div style={{ textAlign: 'right', fontWeight: 800 }}>
                    {profit ? formatUsd(profit.daily) : '—'}
                </div>
                <div style={{ textAlign: 'right', fontWeight: 800 }}>
                    {profit ? formatUsd(profit.monthly) : '—'}
                </div>
                <div style={{ textAlign: 'right', fontWeight: 800 }}>
                    {profit ? formatUsd(profit.yearly) : '—'}
                </div>
            </div>

            {totalDailyRides !== null && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
                    Szacowana liczba przejazdów/dzień:{' '}
                    <strong>{totalDailyRides.toLocaleString('pl-PL')}</strong>
                </div>
            )}
        </div>
    );
}