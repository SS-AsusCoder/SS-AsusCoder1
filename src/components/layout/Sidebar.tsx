import type { ComponentType } from 'react';
import { Shield, LayoutDashboard, Activity, ShieldAlert, ShieldCheck, FlaskConical, BarChart3, ScrollText, FileText, Users, Settings as SettingsIcon, Globe, ChevronLeft } from 'lucide-react';
import { NAV_ITEMS, type NavId } from '../../lib/constants';
import { cn } from '../../lib/utils';

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  LayoutDashboard, Activity, ShieldAlert, ShieldCheck, FlaskConical, BarChart3, ScrollText, FileText, Users, Settings: SettingsIcon, Globe,
};

export function Sidebar({ active, onSelect, open, onToggle }: { active: NavId; onSelect: (id: NavId) => void; open: boolean; onToggle: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={onToggle} />}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900/95 border-r border-slate-800 backdrop-blur-xl flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Shield className="w-5 h-5 text-slate-950" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-100 leading-tight">SentinelDDoS</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Defense Console</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                  isActive ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent',
                )}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-sky-400" />}
                <Icon className={cn('w-4.5 h-4.5 shrink-0', isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300')} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs font-medium text-slate-300">Engine Online</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Detection & mitigation active</p>
          </div>
        </div>
        <button onClick={onToggle} className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 items-center justify-center text-slate-400 hover:text-sky-400 hover:border-sky-500 transition-colors">
          <ChevronLeft className={cn('w-3.5 h-3.5 transition-transform', !open && 'rotate-180')} />
        </button>
      </aside>
    </>
  );
}
