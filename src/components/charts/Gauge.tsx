interface GaugeProps {
  value: number;
  max?: number;
  label: string;
  size?: number;
  color?: string;
}

export function Gauge({ value, max = 100, label, size = 140, color }: GaugeProps) {
  const pct = Math.min(value / max, 1);
  const r = 56;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 10;
  const circumference = Math.PI * r; // half circle
  const dash = circumference * pct;

  const autoColor = pct < 0.4 ? 'rgb(52 211 153)' : pct < 0.7 ? 'rgb(251 191 36)' : pct < 0.9 ? 'rgb(251 146 60)' : 'rgb(244 63 94)';
  const strokeColor = color ?? autoColor;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgb(30 41 59)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-100 font-bold" style={{ fontSize: 22, fontWeight: 700 }}>
          {Math.round(value)}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>
          / {max}
        </text>
      </svg>
      <p className="text-xs text-slate-400 -mt-1">{label}</p>
    </div>
  );
}
