interface DonutProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  center?: string;
}

export function DonutChart({ segments, size = 160, center }: DonutProps) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = 58;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments.map((s) => {
    const ratio = s.value / total;
    const dash = circumference * ratio;
    const arc = { ...s, dash, dashOffset: -offset, ratio };
    offset += dash;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={strokeWidth} />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
          strokeDashoffset={arc.dashOffset}
          strokeLinecap="butt"
          style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.5s ease' }}
        />
      ))}
      {center && (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-100 font-bold" style={{ fontSize: 20, fontWeight: 700 }}>
            {center}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10 }}>
            total
          </text>
        </>
      )}
    </svg>
  );
}

export function DonutLegend({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className="flex flex-col gap-2">
      {segments.map((s, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-slate-400 truncate">{s.label}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-300 font-medium tabular-nums">{s.value.toLocaleString()}</span>
            <span className="text-xs text-slate-500 tabular-nums">{((s.value / total) * 100).toFixed(0)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
