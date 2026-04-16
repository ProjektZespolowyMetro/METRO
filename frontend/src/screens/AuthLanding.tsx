import React, { useState } from 'react';
import './AuthLanding.css';

type Props = {
    onLogin: (username: string, password: string) => Promise<void>;
    onRegister: (username: string, password: string) => Promise<void>;
};

export default function AuthLanding({ onLogin, onRegister }: Props) {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        const cleanUsername = username.trim();
        if (!cleanUsername || !password.trim()) {
            setError('Uzupełnij login i hasło.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            if (mode === 'login') {
                await onLogin(cleanUsername, password);
            } else {
                await onRegister(cleanUsername, password);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Wystąpił błąd autoryzacji.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='auth-landing'>
            <div className='auth-landing__bg' aria-hidden='true' />

            <main className='auth-panel'>
                <div className='auth-panel__card'>
                    <div className='auth-panel__brand'>
                        <span className='auth-panel__chip'>Metro Game</span>
                        <h1>Wejdź do symulatora metra</h1>
                        <p>
                            Logowanie wymagane, aby budować linie i zapisywać
                            wyniki do rankingu.
                        </p>
                    </div>

                    <div className='auth-panel__tabs'>
                        <button
                            className={mode === 'login' ? 'is-active' : ''}
                            onClick={() => setMode('login')}
                            type='button'
                        >
                            Logowanie
                        </button>
                        <button
                            className={mode === 'register' ? 'is-active' : ''}
                            onClick={() => setMode('register')}
                            type='button'
                        >
                            Rejestracja
                        </button>
                    </div>

                    <form className='auth-form' onSubmit={submit}>
                        <label>
                            Login
                            <input
                                value={username}
                                onChange={(ev) => setUsername(ev.target.value)}
                                placeholder='np. metro_master'
                                autoComplete='username'
                            />
                        </label>

                        <label>
                            Hasło
                            <input
                                type='password'
                                value={password}
                                onChange={(ev) => setPassword(ev.target.value)}
                                placeholder='minimum 6 znaków'
                                autoComplete={
                                    mode === 'login'
                                        ? 'current-password'
                                        : 'new-password'
                                }
                            />
                        </label>

                        {error && <div className='auth-form__error'>{error}</div>}

                        <button type='submit' disabled={isSubmitting}>
                            {isSubmitting
                                ? 'Trwa autoryzacja...'
                                : mode === 'login'
                                  ? 'Wejdź do gry'
                                  : 'Utwórz konto i wejdź'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
