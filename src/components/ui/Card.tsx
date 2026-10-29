import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Card({ children, className, hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm shadow-lg',
        hover && 'transition-all duration-300 hover:border-sky-500/40 hover:bg-slate-900/80 hover:shadow-sky-500/5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, action }: { title: string; subtitle?: string; icon?: ComponentType<{ className?: string }>; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-700/50">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Icon className="w-4.5 h-4.5 text-sky-400" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 truncate">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
