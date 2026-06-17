export type AuthResponse = {
    username: string;
    token: string;
};

export type RankingEntry = {
    rank: number;
    username: string;
    line_name: string;
    daily_profit_usd: number;
    num_stations: number;
    total_length_meters: number;
    created_at: string;
};

const API_BASE = (process.env.REACT_APP_API_URL ?? '').replace(/\/$/, '') || '/api';

async function readJsonOrThrow(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await res.json() : null;

    if (!res.ok) {
        const message = body?.error || `HTTP ${res.status}`;
        throw new Error(message);
    }

    return body;
}

export async function registerUser(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    return readJsonOrThrow(res);
}

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    return readJsonOrThrow(res);
}

export async function submitScore(
    token: string,
    payload: {
        line_name: string;
        daily_profit_usd: number;
        total_length_meters: number;
        num_stations: number;
        train_frequency_minutes: number;
    }
): Promise<{ id: number; daily_profit_usd: number; line_name: string }> {
    const res = await fetch(`${API_BASE}/scores/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
    });

    return readJsonOrThrow(res);
}

export async function getRanking(limit = 10): Promise<RankingEntry[]> {
    const res = await fetch(`${API_BASE}/scores/ranking/?limit=${limit}`);
    const data = await readJsonOrThrow(res);
    return data.results || [];
}
