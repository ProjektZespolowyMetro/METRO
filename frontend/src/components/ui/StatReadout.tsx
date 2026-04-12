export default function StatReadout({
    label,
    value,
    color,
    isBold,
}: {
    label: string;
    value: string;
    color: string;
    isBold?: boolean;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
                style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}
            >
                {label}
            </span>
            <span
                style={{
                    fontSize: '14px',
                    fontWeight: isBold ? 800 : 600,
                    color,
                }}
            >
                {value}
            </span>
        </div>
    );
}
