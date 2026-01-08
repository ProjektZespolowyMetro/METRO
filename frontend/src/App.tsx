import React from 'react';
import './App.css';
import MainMap from './screens/MainMap';
import { PinsProvider } from './contexts/PinsContext';

function App() {
    return (
        <div className='App'>
            <PinsProvider>
                <MainMap />
            </PinsProvider>
        </div>
    );
}

export default App;
