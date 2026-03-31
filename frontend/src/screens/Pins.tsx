import React, { useMemo } from 'react';
import { usePins } from '../contexts/PinsContext';
import DeletePinsButton from '../components/DeletePinsButton';

export default function Pins() {
    const {
        activeTool,
        setActiveTool,
        clearPins,
        maintenanceCosts,
        metroUsage,
    } = usePins();

    // Calculate revenue locally since we aren't using the Table component anymore
    // temporary btw
    const ticketPriceUsd = 2.5;
    const totalDailyRides = useMemo(() => {
        if (!metroUsage) return 0;
        let sum = 0;
        for (const key of Object.keys(metroUsage)) {
            const arr = metroUsage[Number(key)];
            if (Array.isArray(arr)) {
                for (const v of arr) sum += Number(v) || 0;
            }
        }
        return sum;
    }, [metroUsage]);

    const dailyRevenue = totalDailyRides * ticketPriceUsd;
    const dailyCost = maintenanceCosts?.daily_cost_usd || 0;
    const dailyProfit = dailyRevenue - dailyCost;

    const formatShortUsd = (n: number) =>
        n.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        });

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                height: '54px',
                padding: '0 20px',
                gap: '24px',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                boxSizing: 'border-box',
                pointerEvents: 'auto', // Re-enable clicks for the bar
            }}
        >
            {/* GROUP 1: TOOLS */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <ToolbarBtn
                    active={activeTool === 'normal'}
                    icon='🖱️'
                    label='Normal'
                    onClick={() => setActiveTool('normal')}
                />
                <ToolbarBtn
                    active={activeTool === 'place'}
                    icon='📌'
                    label='Place'
                    onClick={() => setActiveTool('place')}
                />
                <ToolbarBtn
                    active={activeTool === 'drag'}
                    icon='✋'
                    label='Drag'
                    onClick={() => setActiveTool('drag')}
                />
            </div>

            <div style={{ width: '1px', height: '24px', background: '#ddd' }} />

            {/* GROUP 2: LIVE STATS (The "Table" replacement) */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <StatReadout
                    label='Daily Cost'
                    value={formatShortUsd(dailyCost)}
                    color='#6b7280'
                />
                <StatReadout
                    label='Daily Revenue'
                    value={formatShortUsd(dailyRevenue)}
                    color='#059669'
                />
                <StatReadout
                    label='Daily Profit'
                    value={formatShortUsd(dailyProfit)}
                    color={dailyProfit >= 0 ? '#2563eb' : '#dc2626'}
                    isBold
                />
            </div>

            <div style={{ width: '1px', height: '24px', background: '#ddd' }} />

            {/* GROUP 3: ACTIONS */}
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                <DeletePinsButton onClick={clearPins} />
            </div>
        </div>
    );
}

// Minimalist Stat component for the ribbon
function StatReadout({ label, value, color, isBold }: any) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
                style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}
            >
                {label}
            </span>
            <span
                style={{
                    fontSize: '14px',
                    fontWeight: isBold ? 800 : 600,
                    color,
                }}
            >
                {value}
            </span>
        </div>
    );
}

// Tool button with ribbon styling
function ToolbarBtn({ label, icon, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                border: active ? '1px solid #cbd5e1' : '1px solid transparent',
                borderRadius: '6px',
                background: active ? '#fff' : 'transparent',
                cursor: 'pointer',
                transition: '0.1s',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
        >
            <span style={{ fontSize: '16px' }}>{icon}</span>
            <span
                style={{
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    color: active ? '#1e293b' : '#64748b',
                }}
            >
                {label}
            </span>
        </button>
    );
}
