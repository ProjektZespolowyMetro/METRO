import React from 'react';

interface DeletePinsButtonProps {
    onClick: () => void;
}

const DeletePinsButton: React.FC<DeletePinsButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            style={{
                backgroundColor: '#ff4d4d',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                width: 'max-content',
                whiteSpace: 'nowrap',
            }}
        >
            Delete All Pins
        </button>
    );
};

export default DeletePinsButton;
