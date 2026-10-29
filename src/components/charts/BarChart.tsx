interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  horizontal?: boolean;
  color?: string;
}

export function BarChart({ data, height = 200, horizontal = false, color = 'rgb(56 189 248)' }: BarChartProps) {
  const w = 800;
  const h = height;
  const pad = { l: horizontal ? 90 : 32, r: 16, t: 8, b: horizontal ? 24 : 32 };
  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const gapRatio = 0.3;

  if (horizontal) {
    const barH = (h - pad.t - pad.b) / Math.max(n, 1);
    const innerH = barH * (1 - gapRatio);
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const bw = ((d.value / max) * (w - pad.l - pad.r));
          const by = pad.t + i * barH + (barH - innerH) / 2;
          return (
            <g key={i}>
              <text x={pad.l - 8} y={by + innerH / 2 + 3.5} textAnchor="end" className="fill-slate-400" style={{ fontSize: 10 }}>
                {d.label}
              </text>
              <rect x={pad.l} y={by} width={bw} height={innerH} rx={2} fill={d.color ?? color} opacity="0.8" />
              <text x={pad.l + bw + 4} y={by + innerH / 2 + 3.5} className="fill-slate-400" style={{ fontSize: 10 }}>
                {d.value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  const barW = (w - pad.l - pad.r) / Math.max(n, 1);
  const innerW = barW * (1 - gapRatio);
  const innerPad = (barW - innerW) / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const bh = (d.value / max) * (h - pad.t - pad.b);
        const bx = pad.l + i * barW + innerPad;
        const by = pad.t + (h - pad.t - pad.b) - bh;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={innerW} height={bh} rx={2} fill={d.color ?? color} opacity="0.8" />
            <text x={bx + innerW / 2} y={h - pad.b + 12} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9 }}>
              {d.label.length > 8 ? d.label.slice(0, 7) + '…' : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
