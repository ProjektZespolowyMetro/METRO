import React, { useEffect, useState } from 'react';
import { useRoutes } from '../contexts/RoutesContext';
import { usePins } from '../contexts/PinsContext';
import PinSequenceEditor from '../components/routes/PinSequence';
import RouteTab from '../components/routes/RouteTab';
import Divider from '../components/ui/Divider';
import { ToolbarBtn } from '../components/ui/ToolbarBtn';
import StatReadout from '../components/ui/StatReadout';
import { sendPinsToBackend } from '../services/SendPinsToApi';

type RouteDataMap = Record<
    string,
    {
        construction_costs: {
            tunnel_cost_millions_usd: number;
        };
    }
>;

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

    const [routeData, setRouteData] = useState<RouteDataMap>({});

    useEffect(() => {
        const pinById = new Map(pins.map((p) => [p.id, p]));

        routes.forEach((route) => {
            const resolvedPins = route.pinIds
                .map((id) => pinById.get(id))
                .filter((p): p is NonNullable<typeof p> => p !== undefined);

            if (resolvedPins.length === 0) {
                setRouteData((prev) => {
                    const next = { ...prev };
                    delete next[route.id];
                    return next;
                });
                return;
            }

            sendPinsToBackend(resolvedPins).then((data) => {
                setRouteData((prev) => ({
                    ...prev,
                    [route.id]: {
                        construction_costs: data.construction_costs,
                    },
                }));
            });
        });

        const activeIds = new Set(routes.map((r) => r.id));
        setRouteData((prev) => {
            const pruned = { ...prev };
            Object.keys(pruned).forEach((id) => {
                if (!activeIds.has(id)) delete pruned[id];
            });
            return pruned;
        });
    }, [
        JSON.stringify(routes.map((r) => ({ id: r.id, pinIds: r.pinIds }))),
        JSON.stringify(pins),
    ]);

    const activeRoute = routes.find((r) => r.id === activeRouteId) ?? null;
    const sharedCount = Object.values(segments).filter(
        (s) => s.routeIds.length > 1
    ).length;

    const activeTunnelCost = activeRouteId
        ? routeData[activeRouteId]?.construction_costs?.tunnel_cost_millions_usd
        : undefined;

    const tunnelCostLabel =
        activeTunnelCost !== undefined
            ? `$${activeTunnelCost.toLocaleString()}M`
            : '—';

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

                {/* GROUP 4: STATS */}
                <div style={statsContainerStyle}>
                    {Object.keys(segments).length > 0 && (
                        <>
                            <Divider />
                            <StatReadout
                                label='Roads'
                                value={String(Object.keys(segments).length)} // Use Object.keys().length
                                color='#6b7280'
                            />
                            <StatReadout
                                label='Shared'
                                value={String(sharedCount)}
                                color={sharedCount > 0 ? '#7c3aed' : '#9ca3af'}
                                isBold={sharedCount > 0}
                            />
                        </>
                    )}
                    {activeRouteId && (
                        <>
                            <Divider />
                            {/* 5. Updated Label and Value */}
                            <StatReadout
                                label='Tunnel Cost'
                                value={tunnelCostLabel}
                                color='#6b7280'
                            />
                        </>
                    )}
                </div>
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
    marginLeft: 'auto',
};
