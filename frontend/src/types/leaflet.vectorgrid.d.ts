import * as L from 'leaflet';

declare module 'leaflet' {
    namespace vectorGrid {
        function protobuf(url: string, options?: any): L.Layer;
    }
}
