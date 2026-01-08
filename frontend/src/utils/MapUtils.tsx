import L from 'leaflet';

export function createPinIcon(number?: number) {
    return L.divIcon({
        html: number
            ? `<div style="
          background-color: blue;
          color: white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          font-weight: bold;
        ">${number}</div>`
            : `<div style="
          background-color: deeppink; 
          border-radius: 50%;
          width: 14px;
          height: 14px;
          border: 1px solid white;
        "></div>`,
        className: '',
        iconSize: number ? [30, 30] : [14, 14],
        iconAnchor: number ? [15, 30] : [7, 7],
    });
}
