import { useState } from 'react';
import { Menu, Bell, Search, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn, timeAgo } from '../../lib/utils';
import type { Alert } from '../../types';

export function Topbar({ onMenu, title, alerts, onAckAlert }: { onMenu: () => void; title: string; alerts: Alert[]; onAckAlert: (id: string) => void }) {
  const { profile, signOut } = useAuth();
  const [showAlerts, setShowAlerts] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const unread = alerts.filter((a) => !a.acknowledged).length;

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="lg:hidden text-slate-400 hover:text-slate-200">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-100">{title}</h1>
      </div>
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg bg-slate-800/60 border border-slate-700 w-64">
          <Search className="w-4 h-4 text-slate-500" />
          <input placeholder="Search IPs, attacks..." className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none w-full" />
        </div>
        <div className="relative">
          <button onClick={() => setShowAlerts((v) => !v)} className="relative w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <Bell className="w-4.5 h-4.5" />
            {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
          </button>
          {showAlerts && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAlerts(false)} />
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-20 animate-scale-in overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-100">Notifications</p>
                  <span className="text-xs text-slate-500">{unread} unread</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">No alerts</p>
                  ) : (
                    alerts.slice(0, 20).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => onAckAlert(a.id)}
                        className={cn('w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors', !a.acknowledged && 'bg-slate-800/30')}
                      >
                        <div className="flex items-start gap-2">
                          <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', { info: 'bg-sky-400', warning: 'bg-amber-400', critical: 'bg-rose-400', success: 'bg-emerald-400' }[a.level])} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-200 truncate">{a.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{a.message}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{timeAgo(a.created_at)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu((v) => !v)} className="flex items-center gap-2 px-2 h-9 rounded-lg hover:bg-slate-800 transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-slate-950">
              {profile?.display_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-slate-200 leading-tight">{profile?.display_name ?? 'Analyst'}</p>
              <p className="text-[10px] text-slate-500 uppercase">{profile?.role ?? 'viewer'}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-20 animate-scale-in overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-sm font-medium text-slate-200">{profile?.display_name}</p>
                  <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
                </div>
                <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                  <User className="w-4 h-4" /> Profile
                </button>
                <button onClick={signOut} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-slate-800 transition-colors border-t border-slate-700">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
