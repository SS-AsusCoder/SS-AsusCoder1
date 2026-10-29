import { useMemo } from 'react';

interface LineChartProps {
  series: { name: string; color: string; data: number[] }[];
  height?: number;
  yLabel?: string;
  showGrid?: boolean;
  max?: number;
}

export function LineChart({ series, height = 200, yLabel, showGrid = true, max }: LineChartProps) {
  const w = 800;
  const h = height;
  const pad = { l: 44, r: 12, t: 12, b: 24 };
  const allData = series.flatMap((s) => s.data);
  const maxVal = max ?? Math.max(...allData, 1);
  const len = Math.max(...series.map((s) => s.data.length), 1);

  const x = (i: number) => pad.l + (i / Math.max(len - 1, 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / maxVal) * (h - pad.t - pad.b);

  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= 4; i++) {
      const v = (maxVal / 4) * i;
      lines.push({ v, y: y(v) });
    }
    return lines;
  }, [maxVal]);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {showGrid &&
        gridLines.map((g, i) => (
          <g key={i}>
            <line x1={pad.l} y1={g.y} x2={w - pad.r} y2={g.y} stroke="rgb(51 65 85)" strokeWidth="0.5" strokeDasharray="2 4" />
            <text x={pad.l - 6} y={g.y + 3} textAnchor="end" className="fill-slate-500" style={{ fontSize: 9 }}>
              {Math.round(g.v)}
            </text>
          </g>
        ))}
      {yLabel && (
        <text x={10} y={pad.t + 4} className="fill-slate-500" style={{ fontSize: 9 }}>
          {yLabel}
        </text>
      )}
      {series.map((s, i) => {
        const pts = s.data.map((d, j) => `${x(j)},${y(d)}`).join(' ');
        const areaPts = `${pad.l},${h - pad.b} ${pts} ${x(s.data.length - 1)},${h - pad.b}`;
        return (
          <g key={i}>
            <polygon points={areaPts} fill={`url(#grad-${i})`} />
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
}
