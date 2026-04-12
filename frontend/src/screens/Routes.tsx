import React, { useState, useRef, useEffect } from 'react';
import {
    useRoutes,
    ROUTE_COLORS,
    RouteColor,
    Route,
} from '../contexts/RoutesContext';
import { usePins, Pin } from '../contexts/PinsContext';

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

    const activeRoute = routes.find((r) => r.id === activeRouteId) ?? null;
    const sharedCount = Array.from(segments.values()).filter(
        (s) => s.routeIds.length > 1
    ).length;

    return (
        <div
            style={{
                width: '100%',
                height: '54px',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                boxSizing: 'border-box',
                pointerEvents: 'auto',
                position: 'relative',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '100%',
                    padding: '0 20px',
                    gap: '24px',
                    overflowX: 'auto',
                    overflowY: 'visible',
                }}
            >
                {/* GROUP 1: ACTIONS */}
                <div
                    style={{
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center',
                    }}
                >
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

                        {/* GROUP 2: ROUTE TABS */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '4px',
                                alignItems: 'center',
                            }}
                        >
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

                        {/* GROUP 3: PIN SEQUENCE */}
                        <PinSequenceEditor
                            route={activeRoute}
                            pins={pins}
                            onUpdate={(pinIds) =>
                                updateRoute(activeRoute.id, { pinIds })
                            }
                        />
                    </>
                )}

                {/* GROUP 4: STATS — right side */}
                {segments.size > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            gap: '20px',
                            alignItems: 'center',
                            marginLeft: 'auto',
                        }}
                    >
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

// Pin sequence: pills + add dropdown

function PinSequenceEditor({
    route,
    pins,
    onUpdate,
}: {
    route: Route;
    pins: Pin[];
    onUpdate: (pinIds: string[]) => void;
}) {
    const pinById = (id: string) => pins.find((p) => p.id === id);
    const unusedPins = pins.filter((p) => !route.pinIds.includes(p.id));

    const remove = (index: number) => {
        onUpdate(route.pinIds.filter((_, i) => i !== index));
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {route.pinIds.length === 0 && (
                <span
                    style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        fontStyle: 'italic',
                    }}
                >
                    No stops — add pins below
                </span>
            )}

            {route.pinIds.map((pinId, index) => {
                const pin = pinById(pinId);
                const label = pin?.name || `Pin ${pin?.number ?? index + 1}`;
                return (
                    <React.Fragment key={`${pinId}-${index}`}>
                        {index > 0 && (
                            <span
                                style={{
                                    color: route.color,
                                    fontSize: '11px',
                                    fontWeight: 700,
                                }}
                            >
                                →
                            </span>
                        )}
                        <StopPill
                            label={label}
                            color={route.color}
                            onRemove={() => remove(index)}
                        />
                    </React.Fragment>
                );
            })}

            {unusedPins.length > 0 && (
                <PinDropdown
                    pins={unusedPins}
                    color={route.color}
                    onSelect={(pinId) => onUpdate([...route.pinIds, pinId])}
                />
            )}
        </div>
    );
}

// Stop pill

function StopPill({
    label,
    color,
    onRemove,
}: {
    label: string;
    color: string;
    onRemove: () => void;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '999px',
                background: hovered ? color + '22' : color + '12',
                border: `1px solid ${color}44`,
                fontSize: '12px',
                fontWeight: 600,
                color,
                transition: '0.1s',
            }}
        >
            {label}
            {hovered && (
                <button
                    onClick={onRemove}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#9ca3af',
                        padding: 0,
                        lineHeight: 1,
                        fontWeight: 700,
                    }}
                >
                    ×
                </button>
            )}
        </div>
    );
}

// Pin dropdown

function PinDropdown({
    pins,
    color,
    onSelect,
}: {
    pins: Pin[];
    color: string;
    onSelect: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                !ref.current?.contains(e.target as Node) &&
                !btnRef.current?.contains(e.target as Node)
            )
                setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleOpen = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setDropPos({ top: rect.bottom + 4, left: rect.left });
        }
        setOpen((o) => !o);
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                ref={btnRef}
                onClick={handleOpen}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    border: `1px dashed ${color}66`,
                    borderRadius: '999px',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    color,
                }}
            >
                ＋ Add stop
            </button>
            {open && (
                <div
                    ref={ref}
                    style={{
                        position: 'fixed',
                        top: dropPos.top,
                        left: dropPos.left,
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                        zIndex: 9999,
                        minWidth: '150px',
                        overflow: 'hidden',
                    }}
                >
                    {pins.map((pin) => (
                        <button
                            key={pin.id}
                            onClick={() => {
                                onSelect(pin.id);
                                setOpen(false);
                            }}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 14px',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: '#1e293b',
                                fontWeight: 500,
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.background = '#f3f4f6')
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.background = 'none')
                            }
                        >
                            📌 {pin.name || `Pin ${pin.number ?? ''}`}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Route tab chip

function RouteTab({
    route,
    active,
    onClick,
    onDelete,
}: {
    route: Route;
    active: boolean;
    onClick: () => void;
    onDelete: () => void;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                border: active ? '1px solid #cbd5e1' : '1px solid transparent',
                borderRadius: '6px',
                background: active ? '#fff' : 'transparent',
                cursor: 'pointer',
                transition: '0.1s',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
        >
            <span
                style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: route.color,
                    flexShrink: 0,
                }}
            />
            <span
                style={{
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    color: active ? '#1e293b' : '#64748b',
                }}
            >
                {route.name}
            </span>
            {hovered && (
                <span
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    style={{
                        fontSize: '14px',
                        color: '#9ca3af',
                        fontWeight: 700,
                        lineHeight: 1,
                        marginLeft: '2px',
                    }}
                >
                    ×
                </span>
            )}
        </button>
    );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function ToolbarBtn({
    icon,
    label,
    onClick,
}: {
    icon: string;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                border: '1px solid transparent',
                borderRadius: '6px',
                background: 'transparent',
                cursor: 'pointer',
                transition: '0.1s',
            }}
        >
            <span style={{ fontSize: '16px' }}>{icon}</span>
            <span
                style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}
            >
                {label}
            </span>
        </button>
    );
}

function StatReadout({
    label,
    value,
    color,
    isBold,
}: {
    label: string;
    value: string;
    color: string;
    isBold?: boolean;
}) {
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

function Divider() {
    return (
        <div
            style={{
                width: '1px',
                height: '24px',
                background: '#ddd',
                flexShrink: 0,
            }}
        />
    );
}
