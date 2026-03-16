import { useEffect, useState, RefObject } from 'react';
import L from 'leaflet';

export function useMapInit(containerRef: RefObject<HTMLDivElement | null>) {
    const [map, setMap] = useState<L.Map | null>(null);

    useEffect(() => {
        if (!containerRef.current || map) return;

        const cracowBounds = L.latLngBounds(
            [50.0000, 19.8000], // southWest
            [50.1200, 20.1000]  // northEast
        );

        // init and center on cracow
        const mapInstance = L.map(containerRef.current, {
            minZoom: 12,
            maxZoom: 20,
            maxBounds: cracowBounds,
            maxBoundsViscosity: 1.0
        }).setView([50.0647, 19.945], 15);

        // OpenStreetMap tiles, generates background
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstance);

        // Create a custom pane for streets to ensure they stay BELOW user drawings
        // The standard overlayPane (where polylines go) has z-index 400.
        // We set this to 399 so it is always visually behind.
        mapInstance.createPane('streetsPane');
        mapInstance.getPane('streetsPane')!.style.zIndex = '399';

        const geojsonFiles = [
            'cracow-streets1.geojson',
            'cracow-streets2.geojson',
            'cracow-streets3.geojson',
            'cracow-streets4.geojson',
        ];

        // street geojsons
        geojsonFiles.forEach((file) => {
            fetch(file)
                .then((res) => res.json())
                .then((geojson) => {
                    if (!mapInstance) return;
                    L.geoJSON(geojson, {
                        style: { color: 'blue', weight: 1.5 },
                        pane: 'streetsPane', // Force into the background pane
                    }).addTo(mapInstance);
                })
                .catch((err) => console.error(`Failed to load ${file}:`, err));
        });

        setMap(mapInstance);

        // Cleanup on unmount
        return () => {
            mapInstance.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    return map;
}
