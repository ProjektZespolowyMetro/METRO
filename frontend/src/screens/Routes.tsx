import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRoutes } from '../contexts/RoutesContext';
import { usePins, Pin } from '../contexts/PinsContext';
import PinSequenceEditor from '../components/routes/PinSequence';
import RouteTab from '../components/routes/RouteTab';
import Divider from '../components/ui/Divider';
import { ToolbarBtn } from '../components/ui/ToolbarBtn';
import StatReadout from '../components/ui/StatReadout';
import {
    ConstructionCosts,
    sendPinsToBackend,
} from '../services/SendPinsToApi';

type RouteCostState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; construction_costs: ConstructionCosts; total_length_meters: number }
    | { status: 'error' };

function pinsForRouteSequence(
    pinIds: string[],
    pinById: Map<string, Pin>
): Array<Pin & { number: number }> {
    return pinIds
        .map((id, index) => {
            const pin = pinById.get(id);
            if (!pin) return null;
            return {
                ...pin,
                number: index + 1,
            };
        })
        .filter((p): p is Pin & { number: number } => p !== null);
}

function formatTunnelCost(millions?: number): string {
    if (millions === undefined) return '—';
    return `$${millions.toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
}

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

    const [routeCosts, setRouteCosts] = useState<Record<string, RouteCostState>>({});
    const fetchVersionRef = useRef<Record<string, number>>({});

    const pinById = useMemo(() => new Map(pins.map((p) => [p.id, p])), [pins]);

    const routesKey = JSON.stringify(
        routes.map((r) => ({ id: r.id, pinIds: r.pinIds }))
    );
    const pinsKey = JSON.stringify(
        pins.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, number: p.number }))
    );

    useEffect(() => {
        const activeIds = new Set(routes.map((r) => r.id));

        setRouteCosts((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((id) => {
                if (!activeIds.has(id)) delete next[id];
            });
            return next;
        });

        routes.forEach((route) => {
            const orderedPins = pinsForRouteSequence(route.pinIds, pinById);

            if (orderedPins.length < 2) {
                setRouteCosts((prev) => ({ ...prev, [route.id]: { status: 'idle' } }));
                return;
            }

            const version = (fetchVersionRef.current[route.id] ?? 0) + 1;
            fetchVersionRef.current[route.id] = version;

            setRouteCosts((prev) => ({ ...prev, [route.id]: { status: 'loading' } }));

            sendPinsToBackend(orderedPins)
                .then((data) => {
                    if (fetchVersionRef.current[route.id] !== version) return;
                    setRouteCosts((prev) => ({
                        ...prev,
                        [route.id]: {
                            status: 'ready',
                            construction_costs: data.construction_costs,
                            total_length_meters: data.total_length_meters,
                        },
                    }));
                })
                .catch(() => {
                    if (fetchVersionRef.current[route.id] !== version) return;
                    setRouteCosts((prev) => ({
                        ...prev,
                        [route.id]: { status: 'error' },
                    }));
                });
        });
    }, [routesKey, pinsKey, pinById, routes]);

    const activeRoute = routes.find((r) => r.id === activeRouteId) ?? null;
    const activeCost = activeRouteId ? routeCosts[activeRouteId] : undefined;

    const sharedCount = Object.values(segments).filter(
        (s) => s.routeIds.length > 1
    ).length;

    const tunnelCostLabel = (() => {
        if (!activeRouteId || !activeCost) return '—';
        if (activeCost.status === 'loading') return '...';
        if (activeCost.status === 'error') return 'błąd API';
        if (activeCost.status === 'idle') return '—';
        return formatTunnelCost(
            activeCost.construction_costs.tunnel_cost_millions_usd
        );
    })();

    const tunnelLengthLabel = (() => {
        if (!activeCost || activeCost.status !== 'ready') return null;
        const km = activeCost.construction_costs.tunnel_length_km;
        return `${km.toLocaleString(undefined, { maximumFractionDigits: 2 })} km`;
    })();

    return (
        <div style={containerStyle}>
            <div style={scrollWrapperStyle}>
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

                <div style={statsContainerStyle}>
                    {activeRoute && (
                        <>
                            <Divider />
                            <StatReadout
                                label='Tunnel Cost'
                                value={tunnelCostLabel}
                                color={
                                    activeCost?.status === 'error'
                                        ? '#dc2626'
                                        : '#2563eb'
                                }
                                isBold={activeCost?.status === 'ready'}
                            />
                            {tunnelLengthLabel && (
                                <StatReadout
                                    label='Tunnel Length'
                                    value={tunnelLengthLabel}
                                    color='#6b7280'
                                />
                            )}
                            {activeCost?.status === 'idle' &&
                                activeRoute.pinIds.length < 2 && (
                                    <span style={hintStyle}>
                                        min. 2 przystanki
                                    </span>
                                )}
                        </>
                    )}

                    {Object.keys(segments).length > 0 && (
                        <>
                            <Divider />
                            <StatReadout
                                label='Roads'
                                value={String(Object.keys(segments).length)}
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
                </div>
            </div>
        </div>
    );
}

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
    flexShrink: 0,
};

const statsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    marginLeft: 'auto',
    flexShrink: 0,
};

const hintStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#9ca3af',
    whiteSpace: 'nowrap',
};
