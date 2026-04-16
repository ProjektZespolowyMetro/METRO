import React, { useState } from 'react';

export default function StopPill({
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
