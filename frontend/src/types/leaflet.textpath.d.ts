import * as L from 'leaflet';

declare module 'leaflet' {
  interface Polyline {
    /**
     * Set text along a polyline.
     * Provided by the leaflet-textpath plugin.
     */
    setText(text: string | null, options?: {
      repeat?: boolean;
      offset?: number;
      orientation?: number | string;
      attributes?: Record<string, string>;
      below?: boolean;
      center?: boolean;
    }): void;
  }
}