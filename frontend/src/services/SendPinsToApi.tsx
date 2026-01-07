import { Pin } from '../contexts/PinsContext';

export function sendPinsToBackend(pins: Pin[]) {
    const payload = pins
        .filter((p) => p.number !== undefined)
        .sort((a, b) => a.number! - b.number!)
        .map((p) => ({
            number: p.number,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
        }));

    fetch('http://127.0.0.1:8000/api/pins/', {
        // shouldnt be hardcoded but temporary for now
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pins: payload }),
    })
        .then((res) => res.json())
        .then((data) => {
            console.log('Backend response:', data);
        })
        .catch((err) => {
            console.error('Failed to send pins:', err);
        });
}
