import React from 'react';

type Props = {
    onClick: () => void;
};

export default function SendPinsButton({ onClick }: Props) {
    return (
        <button
            onClick={onClick}
            style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 1000,
                padding: '8px 14px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
            }}
        >
            Send pins
        </button>
    );
}
