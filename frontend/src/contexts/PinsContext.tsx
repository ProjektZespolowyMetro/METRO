import React, { createContext, useState, useEffect, useContext } from 'react';

export type ToolMode = 'select' | 'place' | 'drag' | 'delete';

export type Pin = {
    id: string; // Always a unique identifier
    lat: number;
    lng: number;
    number?: number; // Optional: Can be used for labeling, but doesn't dictate "order"
    name?: string;
};

type PinsContextType = {
    pins: Pin[];
    setPins: React.Dispatch<React.SetStateAction<Pin[]>>;
    addPin: (pin: Omit<Pin, 'id'> & { id?: string }) => void; // Allow id to be optional on creation
    updatePin: (updatedPin: Pin) => void;
    removePin: (id: string) => void;
    clearPins: () => void;

    activeTool: ToolMode;
    setActiveTool: (tool: ToolMode) => void;
    sendError: string | null;
    isSending: boolean;
    maintenanceCosts: any;
    metroUsage: any;
    onSendPins: () => void;
};

const PinsContext = createContext<PinsContextType | undefined>(undefined);

export const usePins = () => {
    const context = useContext(PinsContext);
    if (!context) {
        throw new Error('usePins must be used within PinsProvider');
    }
    return context;
};

export const PinsProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [pins, setPins] = useState<Pin[]>(() => {
        try {
            const saved = localStorage.getItem('pins');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [activeTool, setActiveTool] = useState<ToolMode>('select');
    const [sendError, setSendError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    // Placeholder states for future overhauled logic
    const [maintenanceCosts] = useState({ total: 0 });
    const [metroUsage] = useState({ daily: 0 });

    useEffect(() => {
        localStorage.setItem('pins', JSON.stringify(pins));
    }, [pins]);

    /**
     * Creates a functioning pin.
     * If no ID is provided, it generates a native UUID.
     * Note: "Roads" are no longer drawn as this logic ignores sequential indexing.
     */
    const addPin = (pinData: Omit<Pin, 'id'> & { id?: string }) => {
        const newPin: Pin = {
            ...pinData,
            id: pinData.id || crypto.randomUUID(), // Ensures every pin has an inherent UUID
        };
        setPins((prev) => [...prev, newPin]);
    };

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

    const onSendPins = async () => {
        setIsSending(true);
        setSendError(null);
        try {
            // Updated to simply log the current array of unordered pins
            await new Promise((resolve) => setTimeout(resolve, 1500));
            console.log('Pins synced:', pins);
        } catch (err) {
            setSendError('Connection error: Could not sync pins.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <PinsContext.Provider
            value={{
                pins,
                setPins,
                addPin,
                updatePin,
                removePin,
                clearPins,
                activeTool,
                setActiveTool,
                sendError,
                isSending,
                maintenanceCosts,
                metroUsage,
                onSendPins,
            }}
        >
            {children}
        </PinsContext.Provider>
    );
};
