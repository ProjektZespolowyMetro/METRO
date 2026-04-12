import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useRoutes } from '../contexts/RoutesContext';
import { usePins } from '../contexts/PinsContext';

/**
 * RoadsLayer — Leaflet GeoJSON polylines with banded multi-color shared segments.
 */

type Props = { map: L.Map | null };
type LngLat = [number, number]; // GeoJSON order: [lng, lat]

const PANE_NAME = 'roadsPane';
const PANE_Z_INDEX = '420';
const ROAD_WEIGHT = 5;

export default function RoadsLayer({ map }: Props) {
    const { segments, routes } = useRoutes();
    const { pins } = usePins();
    const layersRef = useRef<L.GeoJSON[]>([]);

    useEffect(() => {
        if (!map) return;

        if (!map.getPane(PANE_NAME)) {
            map.createPane(PANE_NAME);
            map.getPane(PANE_NAME)!.style.zIndex = PANE_Z_INDEX;
            map.getPane(PANE_NAME)!.style.pointerEvents = 'none';
        }

        layersRef.current.forEach((l) => l.remove());
        layersRef.current = [];

        const pinById = (id: string) => pins.find((p) => p.id === id);
        const routeColorMap = Object.fromEntries(
            routes.map((r) => [r.id, r.color])
        );

        // Accumulate features per color across all segments
        const featuresByColor: Record<
            string,
            GeoJSON.Feature<GeoJSON.LineString>[]
        > = {};

        const addFeature = (color: string, coords: LngLat[]) => {
            if (!featuresByColor[color]) featuresByColor[color] = [];
            featuresByColor[color].push({
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: coords },
            });
        };

        for (const seg of Array.from(segments.values())) {
            const pinA = pinById(seg.pinIdA);
            const pinB = pinById(seg.pinIdB);
            if (!pinA || !pinB) continue;

            const colors = seg.routeIds.map(
                (id) => routeColorMap[id] ?? '#888888'
            );
            const n = colors.length;

            /**
             * Replace the two points below with a densely sampled curve.
             * Everything else (band splitting) works unchanged.
             *
             *   const STEPS = 64;
             *   const midLat = (pinA.lat + pinB.lat) / 2 + seg.cpOffsetX;
             *   const midLng = (pinA.lng + pinB.lng) / 2 + seg.cpOffsetY;
             *   const fullLine: LngLat[] = Array.from({ length: STEPS + 1 }, (_, k) => {
             *     const u = k / STEPS;
             *     return [
             *       (1-u)**2 * pinA.lng + 2*(1-u)*u * midLng + u**2 * pinB.lng,
             *       (1-u)**2 * pinA.lat + 2*(1-u)*u * midLat + u**2 * pinB.lat,
             *     ] as LngLat;
             *   });
             *  doesn't work for now so do not uncomment
             */
            const fullLine: LngLat[] = [
                [pinA.lng, pinA.lat],
                [pinB.lng, pinB.lat],
            ];

            if (n === 1) {
                // Simple case: single color, draw as-is
                addFeature(colors[0], fullLine);
            } else {
                // Split the line into N equal bands by interpolating along it
                const bands = splitIntoBands(fullLine, n);
                bands.forEach((bandCoords, i) => {
                    addFeature(colors[i], bandCoords);
                });
            }
        }

        // One GeoJSON layer per color (batched for performance)
        Object.entries(featuresByColor).forEach(([color, features]) => {
            const layer = L.geoJSON(
                {
                    type: 'FeatureCollection',
                    features,
                } as GeoJSON.FeatureCollection,
                {
                    pane: PANE_NAME,
                    style: {
                        color,
                        weight: ROAD_WEIGHT,
                        opacity: 0.95,
                        lineCap: 'butt', // butt caps so bands meet cleanly
                        lineJoin: 'round',
                    },
                }
            ).addTo(map);
            layersRef.current.push(layer);
        });

        return () => {
            layersRef.current.forEach((l) => l.remove());
            layersRef.current = [];
        };
    }, [map, segments, routes, pins]);

    return null;
}

// Geometry helpers

/**
 * Given a polyline (array of [lng, lat] points) and a count N,
 * returns N sub-polylines each covering an equal fraction of the total length.
 *
 * Works for any polyline (2 points for straight lines, many for curves).
 */
function splitIntoBands(line: LngLat[], n: number): LngLat[][] {
    const totalLen = polylineLength(line);
    const bandLen = totalLen / n;
    const bands: LngLat[][] = [];

    let segIdx = 0; // current segment index in `line`
    let consumed = 0; // distance consumed along current segment
    let bandStart = line[0]; // start point of current band

    for (let b = 0; b < n; b++) {
        const band: LngLat[] = [bandStart];
        let remaining = bandLen;

        while (remaining > 1e-10) {
            if (segIdx >= line.length - 1) {
                // Reached end of line — close out
                band.push(line[line.length - 1]);
                remaining = 0;
                break;
            }

            const segStart = line[segIdx];
            const segEnd = line[segIdx + 1];
            const segLen = dist(segStart, segEnd);
            const available = segLen - consumed;

            if (available <= remaining + 1e-10) {
                // Consume rest of this segment
                band.push(segEnd);
                remaining -= available;
                consumed = 0;
                segIdx++;
            } else {
                // Split within this segment
                const t = (consumed + remaining) / segLen;
                const splitPt = lerp(segStart, segEnd, t);
                band.push(splitPt);
                consumed += remaining;
                remaining = 0;
                bandStart = splitPt;
            }
        }

        if (band.length < 2) band.push(band[0]); // degenerate safety
        bands.push(band);

        // Next band starts where this one ended
        if (band.length > 0) bandStart = band[band.length - 1];
    }

    return bands;
}

function polylineLength(line: LngLat[]): number {
    let total = 0;
    for (let i = 0; i < line.length - 1; i++) {
        total += dist(line[i], line[i + 1]);
    }
    return total;
}

/** Euclidean distance in lng/lat space (fine for short road segments) */
function dist(a: LngLat, b: LngLat): number {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a: LngLat, b: LngLat, t: number): LngLat {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
