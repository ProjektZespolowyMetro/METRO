import { Pin } from '../contexts/PinsContext';

export type MetroUsageByPinNumber = Record<number, number[]>;

export type SendPinsResponse = {
    pins: unknown;
    segments: unknown;
    total_length_meters: number;
    metro_usage?: MetroUsageByPinNumber;
    error?: string;
};

export async function sendPinsToBackend(pins: Pin[]): Promise<SendPinsResponse> {
    const payload = pins
        .filter((p) => p.number !== undefined)
        .sort((a, b) => a.number! - b.number!)
        .map((p) => ({
            number: p.number,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
        }));

    const res = await fetch('http://127.0.0.1:8000/api/pins/', {
        // shouldnt be hardcoded but temporary for now
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pins: payload }),
    });

    if (!res.ok) {
        throw new Error(`Failed to send pins: ${res.status} ${res.statusText}`);
    }

    return res.json();
}