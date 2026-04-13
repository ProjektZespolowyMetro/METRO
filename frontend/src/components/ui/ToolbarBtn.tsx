interface ToolbarBtnProps {
    label: string;
    icon: string;
    onClick: () => void;
    active?: boolean; // Pins - true, Routes - false
}

export const ToolbarBtn = ({
    label,
    icon,
    active,
    onClick,
}: ToolbarBtnProps) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            border: active ? '1px solid #cbd5e1' : '1px solid transparent',
            borderRadius: '6px',
            background: active ? '#fff' : 'transparent',
            cursor: 'pointer',
            transition: '0.1s',
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
        }}
    >
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span
            style={{
                fontSize: '13px',
                fontWeight: active ? 600 : 500,
                color: active ? '#1e293b' : '#64748b',
            }}
        >
            {label}
        </span>
    </button>
);
