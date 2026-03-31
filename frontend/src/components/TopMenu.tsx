import React, { useContext } from 'react';
import { MenuContext } from '../contexts/MenuContext';
import { usePins } from '../contexts/PinsContext';
import Pins from '../screens/Pins';
import Routes from '../screens/Routes';
import View from '../screens/View';
import DeletePinsButton from './DeletePinsButton';
import '../css/TopMenu.css';

const TopMenu: React.FC = () => {
    const menuCtx = useContext(MenuContext);
    const { activeTool, setActiveTool, clearPins } = usePins();

    if (!menuCtx)
        throw new Error('MenuContext must be used within a MenuProvider');
    const { activePage, setActivePage } = menuCtx;

    const handleMenuClick = (page: 'Pins' | 'Routes' | 'View') => {
        // Switch page; don't toggle off so the toolbar stays visible
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

            {/* ROW 2: Contextual Toolbar (Changes based on activePage) */}
            <div
                className='contextual-toolbar'
                style={{
                    height: '45px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    background: '#f9fafb',
                    gap: '20px',
                }}
            >
                {activePage === 'Pins' && (
                    <>
                        {/* Selection Tools */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '4px',
                                alignItems: 'center',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#9ca3af',
                                    marginRight: '8px',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Tools
                            </span>
                            <ToolbarBtn
                                active={activeTool === 'normal'}
                                icon='🖱️'
                                label='Select'
                                onClick={() => setActiveTool('normal')}
                            />
                            <ToolbarBtn
                                active={activeTool === 'place'}
                                icon='📌'
                                label='Place'
                                onClick={() => setActiveTool('place')}
                            />
                            <ToolbarBtn
                                active={activeTool === 'drag'}
                                icon='✋'
                                label='Hand'
                                onClick={() => setActiveTool('drag')}
                            />
                        </div>

                        {/* Actions */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '8px',
                                marginLeft: 'auto',
                                alignItems: 'center',
                            }}
                        >
                            <DeletePinsButton onClick={clearPins} />
                        </div>
                    </>
                )}

                {activePage === 'Routes' && (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        Route editing tools will appear here...
                    </div>
                )}

                {activePage === 'View' && (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        Map layer visibility options...
                    </div>
                )}
            </div>

            {/* Main Content Area (Results/Tables) */}
            <div
                className='active-page-container'
                style={{ background: 'transparent', pointerEvents: 'none' }}
            >
                <div style={{ pointerEvents: 'auto' }}>
                    {activePage === 'Pins' && <Pins />}
                    {activePage === 'Routes' && <Routes />}
                    {activePage === 'View' && <View />}
                </div>
            </div>
        </header>
    );
};

// Helper component for the second-row buttons
const ToolbarBtn = ({ active, icon, label, onClick }: any) => (
    <button
        onClick={onClick}
        title={label}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: active ? '#fff' : 'transparent',
            border: active ? '1px solid #e5e7eb' : '1px solid transparent',
            borderRadius: '6px',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: '13px',
            fontWeight: active ? 600 : 400,
            transition: 'all 0.1s ease',
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            color: active ? '#2563eb' : '#4b5563',
        }}
    >
        <span>{icon}</span>
        <span>{label}</span>
    </button>
);

export default TopMenu;
