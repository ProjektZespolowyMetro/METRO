import { useEffect, useState, RefObject } from 'react';
import L from 'leaflet';
import 'leaflet.vectorgrid';

export function useMapInit(containerRef: RefObject<HTMLDivElement | null>) {
    const [map, setMap] = useState<L.Map | null>(null);

    useEffect(() => {
        if (!containerRef.current || map) return;

        const cracowBounds = L.latLngBounds(
            [49.9676104, 19.7899577], // southWest
            [50.1298402, 20.2167892] // northEast
        ); //values taken from hg.gpkg metadata, should not be altered unless tiles are altered as well

        const mapInstance = L.map(containerRef.current, {
            minZoom: 10,
            maxZoom: 16,
            maxBounds: cracowBounds,
            maxBoundsViscosity: 1.0,
        }).setView([50.0487253, 20.0033734], 10);

        // MBTiles pane
        mapInstance.createPane('mbtilesPane');
        mapInstance.getPane('mbtilesPane')!.style.zIndex = '450';

        L.vectorGrid
            .protobuf('http://127.0.0.1:8000/tiles/{z}/{x}/{y}.pbf', {
                vectorTileLayerStyles: {
                    highway_krakow: (properties: any) => {
                        const isMain = [
                            'motorway',
                            'trunk',
                            'primary',
                        ].includes(properties.highway);
                        return {
                            weight: isMain ? 3 : 1,
                            color: isMain ? '#e67e22' : '#7f8c8d',
                            opacity: 1,
                            fill: true,
                        };
                    },
                },
                maxZoom: 16,
                minZoom: 10,
                tms: true,
                pane: 'mbtilesPane',
            })
            .addTo(mapInstance);

        // Streets pane below MBTiles
        mapInstance.createPane('streetsPane');
        mapInstance.getPane('streetsPane')!.style.zIndex = '400';

        const geojsonFiles = [
            'road.geojson',
            'river.geojson',
            'boundary.geojson',
        ];

        // street geojsons
        geojsonFiles.forEach((file) => {
            fetch(file)
                .then((res) => res.json())
                .then((geojson) => {
                    if (!mapInstance) return;
                    if (
                        !geojson ||
                        !geojson.features ||
                        geojson.features.length === 0
                    ) {
                        console.warn(`GeoJSON ${file} has no features`);
                        return;
                    }

                    let style: L.PathOptions = {
                        color: '#34495e',
                        weight: 1.5,
                    };
                    if (file.includes('river'))
                        style = { color: '#3498db', weight: 3 };
                    if (file.includes('boundary'))
                        style = {
                            color: '#95a5a6',
                            weight: 1,
                            dashArray: '5, 5',
                        };

                    L.geoJSON(geojson, {
                        style: style,
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
