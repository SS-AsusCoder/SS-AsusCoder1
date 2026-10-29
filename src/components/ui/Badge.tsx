import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Tone = 'sky' | 'emerald' | 'amber' | 'rose' | 'slate' | 'orange' | 'violet';

const TONES: Record<Tone, string> = {
  sky: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  rose: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
  slate: 'bg-slate-500/10 border-slate-500/30 text-slate-300',
  orange: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
  violet: 'bg-violet-500/10 border-violet-500/30 text-violet-300',
};

export function Badge({ tone = 'slate', children, className, dot = false }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', TONES[tone], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const tone = { low: 'emerald', medium: 'amber', high: 'orange', critical: 'rose' }[severity as 'low' | 'medium' | 'high' | 'critical'] as Tone;
  return <Badge tone={tone} dot>{severity.toUpperCase()}</Badge>;
}
