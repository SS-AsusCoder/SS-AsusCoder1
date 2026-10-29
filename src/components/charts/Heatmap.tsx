interface HeatmapProps {
  data: { day: string; hour: number; value: number }[];
  colorScale?: (v: number, max: number) => string;
}

export function Heatmap({ data, colorScale }: HeatmapProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const max = Math.max(...data.map((d) => d.value), 1);

  const defaultColor = (v: number) => {
    const intensity = v / max;
    if (intensity === 0) return 'rgb(15 23 42)';
    if (intensity < 0.25) return 'rgb(12 74 110)';
    if (intensity < 0.5) return 'rgb(8 145 178)';
    if (intensity < 0.75) return 'rgb(14 165 233)';
    return 'rgb(56 189 248)';
  };
  const color = colorScale ?? defaultColor;

  const cellW = 28;
  const cellH = 18;
  const padL = 36;
  const padT = 20;

  return (
    <svg viewBox={`0 0 ${padL + 24 * cellW + 10} ${padT + 7 * cellH + 10}`} className="w-full">
      {Array.from({ length: 24 }, (_, h) => (
        <text key={h} x={padL + h * cellW + cellW / 2} y={padT - 6} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 8 }}>
          {h % 3 === 0 ? `${h}` : ''}
        </text>
      ))}
      {days.map((d, di) => (
        <g key={d}>
          <text x={padL - 6} y={padT + di * cellH + cellH / 2 + 3} textAnchor="end" className="fill-slate-500" style={{ fontSize: 9 }}>
            {d}
          </text>
          {Array.from({ length: 24 }, (_, h) => {
            const cell = data.find((c) => c.day === d && c.hour === h);
            const v = cell?.value ?? 0;
            return (
              <rect
                key={h}
                x={padL + h * cellW}
                y={padT + di * cellH}
                width={cellW - 1}
                height={cellH - 1}
                rx={2}
                fill={color(v, max)}
                opacity={v === 0 ? 0.3 : 0.9}
              >
                <title>{`${d} ${h}:00 — ${v} attacks`}</title>
              </rect>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
