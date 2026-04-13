import React, {
    createContext,
    useState,
    useContext,
    useCallback,
    useMemo,
    useEffect,
} from 'react';

export type RouteColor =
    | '#2563eb'
    | '#dc2626'
    | '#059669'
    | '#d97706'
    | '#7c3aed'
    | '#db2777';

export type Route = {
    id: string;
    name: string;
    color: RouteColor;
    pinIds: string[];
};

export type RoadSegment = {
    key: string;
    pinIdA: string;
    pinIdB: string;
    cpOffsetX: number; // bezier control point offset from midpoint for later
    cpOffsetY: number;
    routeIds: string[];
};

type RoutesContextType = {
    routes: Route[];
    addRoute: () => void;
    updateRoute: (id: string, patch: Partial<Omit<Route, 'id'>>) => void;
    removeRoute: (id: string) => void;
    clearRoutes: () => void;

    activeRouteId: string | null;
    setActiveRouteId: (id: string | null) => void;

    segments: Record<string, RoadSegment>;
    setSegmentCP: (key: string, offsetX: number, offsetY: number) => void;
};

// Helpers

export const ROUTE_COLORS: RouteColor[] = [
    '#2563eb',
    '#dc2626',
    '#059669',
    '#d97706',
    '#7c3aed',
    '#db2777',
];

function segmentKey(a: string, b: string) {
    return [a, b].sort().join('__');
}

function loadFromStorage<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

// Context

const RoutesContext = createContext<RoutesContextType | undefined>(undefined);

export const useRoutes = () => {
    const ctx = useContext(RoutesContext);
    if (!ctx) throw new Error('useRoutes must be used within RoutesProvider');
    return ctx;
};

export const RoutesProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [routes, setRoutes] = useState<Route[]>(() =>
        loadFromStorage<Route[]>('routes', [])
    );
    const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
    // cpOffsets stored as plain object for JSON serialisation, converted to Map for runtime use
    const [cpOffsetsRaw, setCpOffsetsRaw] = useState<
        Record<string, { x: number; y: number }>
    >(() => loadFromStorage('routes_cpOffsets', {}));

    // Persist routes and cp offsets whenever they change
    useEffect(() => {
        localStorage.setItem('routes', JSON.stringify(routes));
    }, [routes]);

    useEffect(() => {
        localStorage.setItem('routes_cpOffsets', JSON.stringify(cpOffsetsRaw));
    }, [cpOffsetsRaw]);

    const cpOffsets = useMemo(
        () => new Map(Object.entries(cpOffsetsRaw)),
        [cpOffsetsRaw]
    );

    const segments = useMemo(() => {
        // If you use map the roads WILL NOT REDRAW ON CHANGE BEFORE REFRESH!!!!!!
        const newSegments: Record<string, RoadSegment> = {};

        for (const route of routes) {
            for (let i = 0; i < route.pinIds.length - 1; i++) {
                const a = route.pinIds[i];
                const b = route.pinIds[i + 1];
                const key = segmentKey(a, b);
                const offset = cpOffsets.get(key) ?? { x: 0, y: 0 };

                if (newSegments[key]) {
                    if (!newSegments[key].routeIds.includes(route.id)) {
                        newSegments[key] = {
                            ...newSegments[key],
                            routeIds: [...newSegments[key].routeIds, route.id],
                        };
                    }
                } else {
                    newSegments[key] = {
                        key,
                        pinIdA: a,
                        pinIdB: b,
                        cpOffsetX: offset.x,
                        cpOffsetY: offset.y,
                        routeIds: [route.id],
                    };
                }
            }
        }
        return newSegments;
    }, [routes, cpOffsets]);

    const addRoute = useCallback(() => {
        const id = crypto.randomUUID();
        const newRoute: Route = {
            id,
            name: `Route ${routes.length + 1}`,
            color: ROUTE_COLORS[routes.length % ROUTE_COLORS.length],
            pinIds: [],
        };
        setRoutes((prev) => [...prev, newRoute]);
        setActiveRouteId(id);
    }, [routes.length]);

    const updateRoute = useCallback(
        (id: string, patch: Partial<Omit<Route, 'id'>>) => {
            setRoutes((prev) =>
                prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
            );
        },
        []
    );

    const removeRoute = useCallback((id: string) => {
        setRoutes((prev) => prev.filter((r) => r.id !== id));
        setActiveRouteId((prev) => (prev === id ? null : prev));
    }, []);

    const clearRoutes = useCallback(() => {
        if (window.confirm('Are you sure you want to delete all routes?')) {
            setRoutes([]);
            setActiveRouteId(null);
            setCpOffsetsRaw({});
        }
    }, []);

    const setSegmentCP = useCallback(
        (key: string, offsetX: number, offsetY: number) => {
            setCpOffsetsRaw((prev) => ({
                ...prev,
                [key]: { x: offsetX, y: offsetY },
            }));
        },
        []
    );

    return (
        <RoutesContext.Provider
            value={{
                routes,
                addRoute,
                updateRoute,
                removeRoute,
                clearRoutes,
                activeRouteId,
                setActiveRouteId,
                segments,
                setSegmentCP,
            }}
        >
            {children}
        </RoutesContext.Provider>
    );
};
