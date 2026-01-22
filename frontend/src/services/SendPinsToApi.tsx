import { Pin } from '../contexts/PinsContext';

export type MetroUsageByPinNumber = Record<number, number[]>;

export type MaintenanceCosts = {
    frequency_minutes: number;
    frequency_label: string;
    daily_cost_usd: number;
    monthly_cost_usd: number;
    yearly_cost_usd: number;
};

export type ConstructionCosts = {
    tunnel_length_km: number;
    tunnel_cost_millions_usd: number;
    num_stations: number;
    stations_cost_millions_usd: number;
    total_construction_cost_millions_usd: number;
    total_construction_cost_billion_usd: number;
};

export type SendPinsResponse = {
    pins: any[];
    segments: any[];
    total_length_meters: number;
    metro_usage: MetroUsageByPinNumber | { error: string };
    construction_costs: ConstructionCosts;
    maintenance_costs: MaintenanceCosts;
};

export async function sendPinsToBackend(pins: any[], train_frequency = 5): Promise<SendPinsResponse> {
    const res = await fetch('http://127.0.0.1:8000/api/pins/',        {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pins, train_frequency }),
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
}