import React from 'react';

type Props = {
    onClick: () => void;
    disabled?: boolean;
    label?: string;
};

export default function SendPinsButton({
                                           onClick,
                                           disabled = false,
                                           label = 'Send pins',
                                       }: Props) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: '10px 15px',
                backgroundColor: disabled ? '#93c5fd' : 'rgb(25, 118, 210)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 700,
                cursor: disabled ? 'not-allowed' : 'pointer',
                boxShadow: '0 10px 18px rgba(0,0,0,0.12)',
            }}
        >
            {label}
        </button>
    );
}