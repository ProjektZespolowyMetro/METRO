import React, { useState } from 'react';

type Props = {
    currentUsername: string | null;
    onLogin: (username: string, password: string) => Promise<void>;
    onRegister: (username: string, password: string) => Promise<void>;
    onLogout: () => void;
};

export default function AuthPanel({ currentUsername, onLogin, onRegister, onLogout }: Props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const withAuthAction = async (action: 'login' | 'register') => {
        if (loading) return;

        if (!username.trim() || !password.trim()) {
            setMessage('Uzupełnij login i hasło.');
            return;
        }

        try {
            setLoading(true);
            setMessage(null);

            if (action === 'login') {
                await onLogin(username.trim(), password);
                setMessage('Zalogowano.');
            } else {
                await onRegister(username.trim(), password);
                setMessage('Konto utworzone i zalogowano.');
            }

            setPassword('');
        } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Błąd logowania.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                marginBottom: 10,
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 10,
                background: 'rgba(255,255,255,0.75)',
            }}
        >
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Gracz</div>

            {currentUsername ? (
                <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, color: '#111827' }}>
                        Zalogowany: <strong>{currentUsername}</strong>
                    </div>
                    <button
                        onClick={onLogout}
                        style={{
                            borderRadius: 10,
                            border: '1px solid #e5e7eb',
                            background: '#f3f4f6',
                            color: '#111827',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '6px 8px',
                        }}
                    >
                        Wyloguj
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder='login'
                        style={{
                            borderRadius: 8,
                            border: '1px solid #d1d5db',
                            padding: '6px 8px',
                            fontSize: 12,
                        }}
                    />
                    <input
                        type='password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder='hasło'
                        style={{
                            borderRadius: 8,
                            border: '1px solid #d1d5db',
                            padding: '6px 8px',
                            fontSize: 12,
                        }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button
                            onClick={() => withAuthAction('login')}
                            disabled={loading}
                            style={{
                                borderRadius: 10,
                                border: '1px solid #d1d5db',
                                background: '#111827',
                                color: 'white',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '6px 8px',
                            }}
                        >
                            Loguj
                        </button>
                        <button
                            onClick={() => withAuthAction('register')}
                            disabled={loading}
                            style={{
                                borderRadius: 10,
                                border: '1px solid #d1d5db',
                                background: '#f3f4f6',
                                color: '#111827',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '6px 8px',
                            }}
                        >
                            Rejestracja
                        </button>
                    </div>
                </div>
            )}

            {message && <div style={{ marginTop: 8, fontSize: 11, color: '#374151' }}>{message}</div>}
        </div>
    );
}
