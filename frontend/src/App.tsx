import React, { useState } from 'react';
import './App.css';
import MainMap from './screens/MainMap';
import { PinsProvider } from './contexts/PinsContext';
import './css/pinIcon.css';
import AuthLanding from './screens/AuthLanding';
import { loginUser, registerUser } from './services/AuthAndRankingApi';
import { MenuProvider } from './contexts/MenuContext';
import TopMenu from './components/TopMenu';
import { RoutesProvider } from './contexts/RoutesContext';

function App() {
    const [authToken, setAuthToken] = useState<string | null>(() =>
        localStorage.getItem('metroAuthToken')
    );
    const [currentUsername, setCurrentUsername] = useState<string | null>(() =>
        localStorage.getItem('metroUsername')
    );

    const setLoggedInUser = (username: string, token: string) => {
        setCurrentUsername(username);
        setAuthToken(token);
        localStorage.setItem('metroUsername', username);
        localStorage.setItem('metroAuthToken', token);
    };

    const handleRegister = async (username: string, password: string) => {
        const result = await registerUser(username, password);
        setLoggedInUser(result.username, result.token);
    };

    const handleLogin = async (username: string, password: string) => {
        const result = await loginUser(username, password);
        setLoggedInUser(result.username, result.token);
    };

    const handleLogout = () => {
        setCurrentUsername(null);
        setAuthToken(null);
        localStorage.removeItem('metroUsername');
        localStorage.removeItem('metroAuthToken');
    };

    return (
        <div className='App'>
            {authToken && currentUsername ? (
                <RoutesProvider>
                    <PinsProvider>
                        <MenuProvider>
                            <TopMenu />
                            <MainMap
                                authToken={authToken}
                                currentUsername={currentUsername}
                                onLogout={handleLogout}
                            />
                        </MenuProvider>
                    </PinsProvider>
                </RoutesProvider>
            ) : (
                <AuthLanding onLogin={handleLogin} onRegister={handleRegister} />
            )}
        </div>
    );
}

export default App;
