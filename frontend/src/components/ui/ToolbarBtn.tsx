export default function ToolbarBtn({
    icon,
    label,
    onClick,
}: {
    icon: string;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                border: '1px solid transparent',
                borderRadius: '6px',
                background: 'transparent',
                cursor: 'pointer',
                transition: '0.1s',
            }}
        >
            <span style={{ fontSize: '16px' }}>{icon}</span>
            <span
                style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}
            >
                {label}
            </span>
        </button>
    );
}
