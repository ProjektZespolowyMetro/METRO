import React from 'react';
import { useRoutes } from '../contexts/RoutesContext';
import { usePins } from '../contexts/PinsContext';
import PinSequenceEditor from '../components/routes/PinSequence';
import RouteTab from '../components/routes/RouteTab';
import Divider from '../components/ui/Divider';
import { ToolbarBtn } from '../components/ui/ToolbarBtn';
import StatReadout from '../components/ui/StatReadout';

export default function Routes() {
    const {
        routes,
        addRoute,
        updateRoute,
        removeRoute,
        clearRoutes,
        activeRouteId,
        setActiveRouteId,
        segments,
    } = useRoutes();
    const { pins } = usePins();

    // Memoize stats logic to keep the render cycle light
    const activeRoute = routes.find((r) => r.id === activeRouteId) ?? null;
    const sharedCount = Array.from(segments.values()).filter(
        (s) => s.routeIds.length > 1
    ).length;

    return (
        <div style={containerStyle}>
            <div style={scrollWrapperStyle}>
                {/* GROUP 1: ACTIONS */}
                <div style={groupStyle}>
                    <ToolbarBtn
                        icon='＋'
                        label='New Route'
                        onClick={addRoute}
                    />
                    {routes.length > 0 && (
                        <ToolbarBtn
                            icon='🗑️'
                            label='Clear All'
                            onClick={clearRoutes}
                        />
                    )}
                </div>

                {/* GROUP 2: ROUTE TABS */}
                {routes.length > 0 && (
                    <>
                        <Divider />
                        <div style={groupStyle}>
                            {routes.map((route) => (
                                <RouteTab
                                    key={route.id}
                                    route={route}
                                    active={route.id === activeRouteId}
                                    onClick={() =>
                                        setActiveRouteId(
                                            route.id === activeRouteId
                                                ? null
                                                : route.id
                                        )
                                    }
                                    onDelete={() => removeRoute(route.id)}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* GROUP 3: PIN SEQUENCE */}
                {activeRoute && (
                    <>
                        <Divider />
                        <PinSequenceEditor
                            route={activeRoute}
                            pins={pins}
                            onUpdate={(pinIds) =>
                                updateRoute(activeRoute.id, { pinIds })
                            }
                        />
                    </>
                )}

                {/* GROUP 4: STATS (Right Aligned) */}
                {segments.size > 0 && (
                    <div style={statsContainerStyle}>
                        <Divider />
                        <StatReadout
                            label='Roads'
                            value={String(segments.size)}
                            color='#6b7280'
                        />
                        <StatReadout
                            label='Shared'
                            value={String(sharedCount)}
                            color={sharedCount > 0 ? '#7c3aed' : '#9ca3af'}
                            isBold={sharedCount > 0}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Styles ---

const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '54px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
    position: 'relative',
};

const scrollWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    padding: '0 20px',
    gap: '24px',
    overflowX: 'auto',
    overflowY: 'visible',
};

const groupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
};

const statsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    marginLeft: 'auto', // Pushes stats to the far right
};
