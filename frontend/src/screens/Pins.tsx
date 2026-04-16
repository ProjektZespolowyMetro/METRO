import React from 'react';
import { usePins } from '../contexts/PinsContext';
import { useMetroStats } from '../hooks/useMetroStats';
import DeletePinsButton from '../components/DeletePinsButton';
import StatReadout from '../components/ui/StatReadout';
import { ToolbarBtn } from '../components/ui/ToolbarBtn';
import Divider from '../components/ui/Divider';

export default function Pins() {
    const {
        activeTool,
        setActiveTool,
        clearPins,
        maintenanceCosts,
        metroUsage,
    } = usePins();

    const stats = useMetroStats(metroUsage, maintenanceCosts);

    return (
        <div style={containerStyle}>
            {/* GROUP 1: TOOLS */}
            <div style={groupStyle}>
                <ToolbarBtn
                    active={activeTool === 'select'}
                    icon='🖱️'
                    label='Select'
                    onClick={() => setActiveTool('select')}
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
                <ToolbarBtn
                    active={activeTool === 'delete'}
                    icon='🗑️'
                    label='Delete'
                    onClick={() => setActiveTool('delete')}
                />
            </div>

            <Divider />

            {/* GROUP 2: LIVE STATS */}
            <div style={groupStyle}>
                <StatReadout
                    label='Daily Cost'
                    value={stats.dailyCost}
                    color='#6b7280'
                />
                <StatReadout
                    label='Daily Revenue'
                    value={stats.dailyRevenue}
                    color='#059669'
                />
                <StatReadout
                    label='Daily Profit'
                    value={stats.dailyProfit}
                    color={stats.rawProfit >= 0 ? '#2563eb' : '#dc2626'}
                    isBold
                />
            </div>

            <Divider />

            {/* GROUP 3: ACTIONS */}
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                <DeletePinsButton onClick={clearPins} />
            </div>
        </div>
    );
}

const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    height: '54px',
    padding: '0 20px',
    gap: '24px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
};

const groupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
};
