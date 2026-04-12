import { useRoutes } from '../contexts/RoutesContext';
import { usePins } from '../contexts/PinsContext';
import PinSequenceEditor from '../components/routes/PinSequence';
import RouteTab from '../components/routes/RouteTab';
import Divider from '../components/ui/Divider';
import ToolbarBtn from '../components/ui/ToolbarBtn';
import StatReadout from '../components/ui/StatReadout';

export default function Routes() {
    const {
        routes,
        addRoute,
        updateRoute,
        removeRoute,
        clearRoutes,
        activeRouteId,
        setActiveRouteId,
        segments,
    } = useRoutes();
    const { pins } = usePins();

    const activeRoute = routes.find((r) => r.id === activeRouteId) ?? null;
    const sharedCount = Array.from(segments.values()).filter(
        (s) => s.routeIds.length > 1
    ).length;

    return (
        <div
            style={{
                width: '100%',
                height: '54px',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                boxSizing: 'border-box',
                pointerEvents: 'auto',
                position: 'relative',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '100%',
                    padding: '0 20px',
                    gap: '24px',
                    overflowX: 'auto',
                    overflowY: 'visible',
                }}
            >
                {/* GROUP 1: ACTIONS */}
                <div
                    style={{
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center',
                    }}
                >
                    <ToolbarBtn
                        icon='＋'
                        label='New Route'
                        onClick={addRoute}
                    />
                    {routes.length > 0 && (
                        <ToolbarBtn
                            icon='🗑️'
                            label='Clear All'
                            onClick={clearRoutes}
                        />
                    )}
                </div>

                {routes.length > 0 && (
                    <>
                        <Divider />

                        {/* GROUP 2: ROUTE TABS */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '4px',
                                alignItems: 'center',
                            }}
                        >
                            {routes.map((route) => (
                                <RouteTab
                                    key={route.id}
                                    route={route}
                                    active={route.id === activeRouteId}
                                    onClick={() =>
                                        setActiveRouteId(
                                            route.id === activeRouteId
                                                ? null
                                                : route.id
                                        )
                                    }
                                    onDelete={() => removeRoute(route.id)}
                                />
                            ))}
                        </div>
                    </>
                )}

                {activeRoute && (
                    <>
                        <Divider />

                        {/* GROUP 3: PIN SEQUENCE */}
                        <PinSequenceEditor
                            route={activeRoute}
                            pins={pins}
                            onUpdate={(pinIds) =>
                                updateRoute(activeRoute.id, { pinIds })
                            }
                        />
                    </>
                )}

                {/* GROUP 4: STATS — right side */}
                {segments.size > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            gap: '20px',
                            alignItems: 'center',
                            marginLeft: 'auto',
                        }}
                    >
                        <Divider />
                        <StatReadout
                            label='Roads'
                            value={String(segments.size)}
                            color='#6b7280'
                        />
                        <StatReadout
                            label='Shared'
                            value={String(sharedCount)}
                            color={sharedCount > 0 ? '#7c3aed' : '#9ca3af'}
                            isBold={sharedCount > 0}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
