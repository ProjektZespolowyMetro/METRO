import React, { createContext, useState, useEffect, useContext } from 'react';
import {
    sendPinsToBackend,
    MaintenanceCosts,
    MetroUsageByPinNumber,
} from '../services/SendPinsToApi';
import { newId } from '../utils/id';

export type ToolMode = 'select' | 'place' | 'drag' | 'delete';

export type Pin = {
    id: string;
    lat: number;
    lng: number;
    number?: number; // order of stations
    isDraft?: boolean; // temporary marker not confirmed by user yet
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
    maintenanceCosts: MaintenanceCosts | null;
    metroUsage: MetroUsageByPinNumber | { error: string } | null;
    totalLengthMeters: number | null;
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
            if (!saved) return [];

            // Do not restore unfinished draft pins from previous session.
            const parsed = JSON.parse(saved) as Pin[];
            return parsed.filter((pin) => !pin.isDraft);
        } catch {
            return [];
        }
    });

    const [activeTool, setActiveTool] = useState<ToolMode>('select');
    const [sendError, setSendError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    const [maintenanceCosts, setMaintenanceCosts] =
        useState<MaintenanceCosts | null>(null);
    const [metroUsage, setMetroUsage] = useState<
        MetroUsageByPinNumber | { error: string } | null
    >(null);
    const [totalLengthMeters, setTotalLengthMeters] = useState<number | null>(
        null
    );

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
            id: pinData.id || newId(),
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
            setMaintenanceCosts(null);
            setMetroUsage(null);
            setTotalLengthMeters(null);
            setSendError(null);
        }
    };

    const onSendPins = async () => {
        if (isSending) return;

        const firstMissing = pins.find((p) => p.number === undefined);
        if (firstMissing) {
            setSendError('Nadaj numer każdej pinezce przed wysłaniem.');
            return;
        }

        setIsSending(true);
        setSendError(null);

        try {
            const data = await sendPinsToBackend(pins);
            setMaintenanceCosts(data.maintenance_costs ?? null);

            if (data.metro_usage && 'error' in data.metro_usage) {
                setMetroUsage(null);
                setSendError(data.metro_usage.error || 'Błąd kalkulatora.');
            } else {
                setMetroUsage(data.metro_usage ?? null);
            }

            setTotalLengthMeters(data.total_length_meters ?? null);
        } catch (err) {
            setSendError(
                err instanceof Error
                    ? err.message
                    : 'Connection error: Could not sync pins.'
            );
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
                totalLengthMeters,
                onSendPins,
            }}
        >
            {children}
        </PinsContext.Provider>
    );
};
