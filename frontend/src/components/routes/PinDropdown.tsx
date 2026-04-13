import React, { useState, useRef, useEffect } from 'react';
import { Pin } from '../../contexts/PinsContext';

export default function PinDropdown({
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
