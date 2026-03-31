import React, { useContext } from 'react';
import { MenuContext } from '../contexts/MenuContext';
import Pins from '../screens/Pins';
import Routes from '../screens/Routes';
import View from '../screens/View';
import '../css/TopMenu.css';

const TopMenu: React.FC = () => {
    const menuCtx = useContext(MenuContext);

    if (!menuCtx)
        throw new Error('MenuContext must be used within a MenuProvider');

    const { activePage, setActivePage } = menuCtx;

    const handleMenuClick = (page: 'Pins' | 'Routes' | 'View') => {
        setActivePage(page);
    };

    return (
        <header
            className='top-nav-wrapper'
            style={{ borderBottom: '1px solid #e5e7eb', background: '#fff' }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
        >
            {/* ROW 1: Main Navigation Tabs */}
            <div
                className='paint-menu-bar'
                style={{ borderBottom: '1px solid #f3f4f6' }}
            >
                <button
                    className={`paint-menu-btn ${activePage === 'Pins' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('Pins')}
                >
                    Pins
                </button>
                <button
                    className={`paint-menu-btn ${activePage === 'Routes' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('Routes')}
                >
                    Routes
                </button>
                <button
                    className={`paint-menu-btn ${activePage === 'View' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('View')}
                >
                    View
                </button>
            </div>

            {/* ROW 2: Page Content (each page owns its own toolbar now) */}
            <div className='active-page-container'>
                {activePage === 'Pins' && <Pins />}
                {activePage === 'Routes' && <Routes />}
                {activePage === 'View' && <View />}
            </div>
        </header>
    );
};

export default TopMenu;
