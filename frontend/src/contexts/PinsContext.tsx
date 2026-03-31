import React, { createContext, useState, useEffect, useContext } from 'react';

// New type for the interactive tool menu
export type ToolMode = 'normal' | 'place' | 'drag' | 'delete';

export type Pin = {
    id: string; //used to identify unset pins
    lat: number; //latitude
    lng: number; //longitude
    number?: number; // order of stations
    name?: string; // both are null when adding empty pins,
    // name is unused for now
};

type PinsContextType = {
    pins: Pin[];
    setPins: React.Dispatch<React.SetStateAction<Pin[]>>; //type of useState
    addPin: (pin: Pin) => void;
    updatePin: (updatedPin: Pin) => void;
    removePin: (id: string) => void;
    clearPins: () => void;

    // UI & Tool States for the Menu
    activeTool: ToolMode;
    setActiveTool: (tool: ToolMode) => void;
    sendError: string | null;
    isSending: boolean;
    maintenanceCosts: any;
    metroUsage: any;
    onSendPins: () => void;
};

export const usePins = () => {
    const context = useContext(PinsContext);
    // In case of usage outside this provider throw an error
    if (!context) {
        throw new Error('usePins must be used within PinsProvider');
    }
    return context;
};

// Undefined outside this provider, default value is undefined as well.
const PinsContext = createContext<PinsContextType | undefined>(undefined);

export const PinsProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [pins, setPins] = useState<Pin[]>(() => {
        // load from localStorage on init
        try {
            const saved = localStorage.getItem('pins');
            //if default value (undefined) then we return an empty array.
            //if found anything then save whatever found
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [activeTool, setActiveTool] = useState<ToolMode>('normal');
    const [sendError, setSendError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    // These should be updated by calculation logic elsewhere
    const [maintenanceCosts] = useState({ total: 0 });
    const [metroUsage] = useState({ daily: 0 });

    // save on first render and whenever array of pins is altered
    useEffect(() => {
        localStorage.setItem('pins', JSON.stringify(pins));
    }, [pins]);

    //Copy all existing pins into a new array and append a new pin
    const addPin = (pin: Pin) => setPins((prev) => [...prev, pin]);

    // Instead of removing and adding pin with passed id we loop
    // through the array to avoid copying it twice
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

    // Handler for the Send button in the PinMenu
    const onSendPins = async () => {
        setIsSending(true);
        setSendError(null);
        try {
            // Your API logic here
            await new Promise((resolve) => setTimeout(resolve, 1500));
            console.log('Pins synced successfully');
        } catch (err) {
            setSendError('Connection error: Could not sync pins.');
        } finally {
            setIsSending(false);
        }
    };

    // Every nested component in App.tsx has access to pin logic
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
