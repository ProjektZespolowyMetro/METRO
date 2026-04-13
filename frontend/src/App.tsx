import React from 'react';
import './App.css';
import MainMap from './screens/MainMap';
import { PinsProvider } from './contexts/PinsContext';
import './css/pinIcon.css';
import { MenuProvider } from './contexts/MenuContext';
import TopMenu from './components/TopMenu';
import { RoutesProvider } from './contexts/RoutesContext';

function App() {
    return (
        <div className='App'>
            <RoutesProvider>
                <PinsProvider>
                    <MenuProvider>
                        <TopMenu />
                        <MainMap />
                    </MenuProvider>
                </PinsProvider>
            </RoutesProvider>
        </div>
    );
}

export default App;
