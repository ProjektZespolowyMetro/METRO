import React from 'react';
import './App.css';
import MainMap from './screens/MainMap';
import { PinsProvider } from './contexts/PinsContext';
import './css/pinIcon.css';
import { MenuProvider } from './contexts/MenuContext';
import TopMenu from './components/TopMenu';

function App() {
    return (
        <div className='App'>
            <PinsProvider>
                <MenuProvider>
                    <TopMenu />
                    <MainMap />
                </MenuProvider>
            </PinsProvider>
        </div>
    );
}

export default App;
