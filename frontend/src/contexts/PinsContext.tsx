import React, { createContext, useState, useEffect, useContext } from 'react';

export type Pin = {
    id: string;
    lat: number;
    lng: number;
    number?: number;
    name?: string;
};

type PinsContextType = {
    pins: Pin[];
    setPins: React.Dispatch<React.SetStateAction<Pin[]>>;
    addPin: (pin: Pin) => void;
    updatePin: (updatedPin: Pin) => void;
    removePin: (id: string) => void;
    clearPins: () => void;
};

export const usePins = () => {
    const context = useContext(PinsContext);
    if (!context) {
        throw new Error('usePins must be used within PinsProvider');
    }
    return context;
};

const PinsContext = createContext<PinsContextType | undefined>(undefined);

export const PinsProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [pins, setPins] = useState<Pin[]>(() => {
        // load from localStorage on init
        try {
            const saved = localStorage.getItem('pins');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // persist pins to localStorage on change
    useEffect(() => {
        localStorage.setItem('pins', JSON.stringify(pins));
    }, [pins]);

    const addPin = (pin: Pin) => setPins((prev) => [...prev, pin]);

    const updatePin = (updatedPin: Pin) =>
        setPins((prev) =>
            prev.map((p) => (p.id === updatedPin.id ? updatedPin : p))
        );

    const removePin = (id: string) =>
        setPins((prev) => prev.filter((p) => p.id !== id));

    const clearPins = () => {
        if (window.confirm('Are you sure you want to delete all pins?')) {
            setPins([]);
        }
    };

    return (
        <PinsContext.Provider
            value={{ pins, setPins, addPin, updatePin, removePin, clearPins }}
        >
            {children}
        </PinsContext.Provider>
    );
};
