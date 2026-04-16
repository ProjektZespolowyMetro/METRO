import React from 'react';
import { Route } from '../../contexts/RoutesContext';
import { Pin } from '../../contexts/PinsContext';
import PinDropdown from './PinDropdown';
import StopPill from './StopPill';

export default function PinSequenceEditor({
    route,
    pins,
    onUpdate,
}: {
    route: Route;
    pins: Pin[];
    onUpdate: (pinIds: string[]) => void;
}) {
    const pinById = (id: string) => pins.find((p) => p.id === id);
    const unusedPins = pins.filter((p) => !route.pinIds.includes(p.id));

    const remove = (index: number) => {
        onUpdate(route.pinIds.filter((_, i) => i !== index));
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {route.pinIds.length === 0 && (
                <span
                    style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        fontStyle: 'italic',
                    }}
                >
                    No stops — add pins below
                </span>
            )}

            {route.pinIds.map((pinId, index) => {
                const pin = pinById(pinId);
                const label = pin?.name || `Pin ${pin?.number ?? index + 1}`;
                return (
                    <React.Fragment key={`${pinId}-${index}`}>
                        {index > 0 && (
                            <span
                                style={{
                                    color: route.color,
                                    fontSize: '11px',
                                    fontWeight: 700,
                                }}
                            >
                                →
                            </span>
                        )}
                        <StopPill
                            label={label}
                            color={route.color}
                            onRemove={() => remove(index)}
                        />
                    </React.Fragment>
                );
            })}

            {unusedPins.length > 0 && (
                <PinDropdown
                    pins={unusedPins}
                    color={route.color}
                    onSelect={(pinId) => onUpdate([...route.pinIds, pinId])}
                />
            )}
        </div>
    );
}
