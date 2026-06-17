import L from 'leaflet';

export function createPinIcon(
    number?: number,
    isSelected: boolean = false,
    isDraft: boolean = false
) {
    const isNumbered = number !== undefined;

    const classes = [
        'pin',
        isNumbered ? 'pin--numbered' : 'pin--dot',
        isDraft ? 'pin--draft' : '',
        isSelected ? 'pin--selected' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const html = isNumbered
        ? `<div class="${classes}"><span class="pin__label">${number}</span></div>`
        : `<div class="${classes}"></div>`;

    // Rozmiary dopasowane do tego co mieliście:
    // - numbered: 30x30, anchor "na dole"
    // - dot: 14x14, anchor w środku
    const iconSize: [number, number] = isNumbered ? [30, 30] : [14, 14];
    const iconAnchor: [number, number] = isNumbered ? [15, 30] : [7, 7];

    return L.divIcon({
        html,
        className: '', // ważne: nie dodawaj leafletowego wrappera z marginesami
        iconSize,
        iconAnchor,
    });
}