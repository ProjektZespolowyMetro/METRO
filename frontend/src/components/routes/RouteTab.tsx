import React, { useState, useRef, useEffect } from 'react';
import { Route } from '../../contexts/RoutesContext';
import { Pin } from '../../contexts/PinsContext';
import PinDropdown from './PinDropdown';
import StopPill from './StopPill';

export default function RouteTab({
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
