import { useEffect, useState, RefObject, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.vectorgrid';

export function useMapInit(containerRef: RefObject<HTMLDivElement | null>) {
    const [map, setMap] = useState<L.Map | null>(null);
    const hasInitRef = useRef(false); // Prevents double-init in Strict Mode

    useEffect(() => {
        if (!containerRef.current || hasInitRef.current) return;
        hasInitRef.current = true;

        const cracowBounds = L.latLngBounds(
            [49.9676104, 19.7899577], // southWest
            [50.1298402, 20.2167892] // northEast
        ); //values taken from hg.gpkg metadata, should not be altered unless tiles are altered as well

        const mapInstance = L.map(containerRef.current, {
            minZoom: 12,
            maxZoom: 16,
            zoomControl: false,
            maxBounds: cracowBounds,
            maxBoundsViscosity: 1.0,
            preferCanvas: true, // Optimization: Renders GeoJSONs on Canvas instead of SVG
        }).setView([50.0487253, 20.0033734], 13);

        // MBTiles pane
        mapInstance.createPane('mbtilesPane');
        mapInstance.getPane('mbtilesPane')!.style.zIndex = '450';

        L.vectorGrid
            .protobuf('http://127.0.0.1:8000/tiles/{z}/{x}/{y}.pbf', {
                // @ts-ignore: VectorGrid adds .tile to L.Canvas
                rendererFactory: L.Canvas.tile || (L.canvas as any).tile,
                vectorTileLayerStyles: {
                    highway_krakow: (properties: any, zoom: number) => {
                        const isMain = [
                            'motorway',
                            'trunk',
                            'primary',
                        ].includes(properties.highway);
                        if (zoom < 14 && !isMain) return { stroke: false };
                        return {
                            weight: isMain ? 2 : 1,
                            color: isMain ? '#e67e22' : '#7f8c8d',
                            opacity: 1,
                        };
                    },
                },
                maxZoom: 16,
                minZoom: 12,
                tms: true,
                pane: 'mbtilesPane',
            })
            .addTo(mapInstance);

        // Streets pane below MBTiles
        mapInstance.createPane('streetsPane');
        mapInstance.getPane('streetsPane')!.style.zIndex = '400';

        const geojsonFiles = [
            { name: 'road.geojson', style: { color: '#34495e', weight: 1.5 } },
            { name: 'river.geojson', style: { color: '#3498db', weight: 3 } },
            {
                name: 'boundary.geojson',
                style: { color: '#95a5a6', weight: 1, dashArray: '5, 5' },
            },
        ];

        // street geojsons - Fetched only once
        geojsonFiles.forEach((file) => {
            fetch(file.name, { cache: 'force-cache' }) // Explicitly tell browser to use cache
                .then((res) => res.json())
                .then((geojson) => {
                    if (!mapInstance) return;
                    L.geoJSON(geojson, {
                        style: file.style,
                        pane: 'streetsPane', // Force into the background pane
                    }).addTo(mapInstance);
                })
                .catch((err) =>
                    console.error(`Failed to load ${file.name}:`, err)
                );
        });

        L.control
            .zoom({
                position: 'bottomright',
            })
            .addTo(mapInstance);

        setMap(mapInstance);

        // Cleanup on unmount
        return () => {
            mapInstance.remove();
            hasInitRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    return map;
}
