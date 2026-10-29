import type { ComponentType } from 'react';
import { cn } from '../../lib/utils';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  tone?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'orange';
  trend?: { value: number; up: boolean };
  sub?: string;
  spark?: number[];
}

const TONES = {
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', stroke: 'rgb(56 189 248)' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', stroke: 'rgb(52 211 153)' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', stroke: 'rgb(251 191 36)' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', stroke: 'rgb(251 113 133)' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', stroke: 'rgb(167 139 250)' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', stroke: 'rgb(251 146 60)' },
};

export function StatCard({ label, value, icon: Icon, tone = 'sky', trend, sub, spark }: StatCardProps) {
  const t = TONES[tone];
  return (
    <Card hover className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn('w-11 h-11 rounded-lg border flex items-center justify-center', t.bg, t.border)}>
            <Icon className={cn('w-5 h-5', t.text)} />
          </div>
          {trend && (
            <span className={cn('text-xs font-medium', trend.up ? 'text-emerald-400' : 'text-rose-400')}>
              {trend.up ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        <p className="mt-4 text-2xl font-bold text-slate-100 tabular-nums">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {spark && spark.length > 1 && <Sparkline data={spark} color={t.stroke} />}
    </Card>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 200;
  const h = 32;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - ((d - min) / range) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}
