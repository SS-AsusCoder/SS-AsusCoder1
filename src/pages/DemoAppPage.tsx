import { useState } from 'react';
import { Globe, ShieldAlert, ShoppingCart, Search, User, Home, Shield, AlertTriangle } from 'lucide-react';
import { useEngine } from '../hooks/useEngine';
import { Badge } from '../components/ui/Badge';
import { cn, formatNumber, formatBytes } from '../lib/utils';

const DEMO_PRODUCTS = [
  { id: 1, name: 'Quantum Laptop Pro', price: 2499, image: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?w=300' },
  { id: 2, name: 'Neural Headset X', price: 349, image: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?w=300' },
  { id: 3, name: 'HoloDisplay 4K', price: 1299, image: 'https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?w=300' },
  { id: 4, name: 'SecureVault Drive', price: 199, image: 'https://images.pexels.com/photos/325153/pexels-photo-325153.jpeg?w=300' },
  { id: 5, name: 'Titan Server Rack', price: 8999, image: 'https://images.pexels.com/photos/325229/pexels-photo-325229.jpeg?w=300' },
  { id: 6, name: 'Phantom Router 6G', price: 449, image: 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?w=300' },
];

export function DemoAppPage() {
  const { sample, snapshot, attackActive, startAttack, stopAttack, attackType } = useEngine();
  const [cartCount, setCartCount] = useState(0);
  const [search, setSearch] = useState('');

  const isUnderAttack = attackActive && snapshot?.threatScore && snapshot.threatScore > 50;

  return (
    <div className="space-y-4">
      {/* Control banner */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 flex flex-wrap items-center gap-3">
        <Shield className="w-5 h-5 text-sky-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200">Protected Demo Application</p>
          <p className="text-xs text-slate-500">This demo app is being monitored by SentinelDDoS in real-time</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className={cn('w-2 h-2 rounded-full', attackActive ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400')} />
            {attackActive ? `Under ${attackType?.toUpperCase()} attack` : 'All systems normal'}
          </div>
          {attackActive ? (
            <button onClick={stopAttack} className="px-3 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors">
              Stop Attack
            </button>
          ) : (
            <button onClick={() => startAttack('http_flood', 3, '/demo', 30000, true)} className="px-3 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs hover:bg-rose-500/20 transition-colors">
              Simulate Attack
            </button>
          )}
        </div>
      </div>

      {/* Live metrics bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-center">
          <p className="text-xs text-slate-500">Requests/s</p>
          <p className="text-lg font-bold tabular-nums text-slate-100">{formatNumber(sample?.requestsPerSec ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-center">
          <p className="text-xs text-slate-500">Bandwidth</p>
          <p className="text-lg font-bold tabular-nums text-slate-100">{formatBytes(sample?.bandwidthMbps ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-center">
          <p className="text-xs text-slate-500">Blocked/s</p>
          <p className={cn('text-lg font-bold tabular-nums', attackActive ? 'text-rose-400' : 'text-emerald-400')}>{formatNumber(sample?.blocked ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-center">
          <p className="text-xs text-slate-500">Threat Score</p>
          <p className={cn('text-lg font-bold tabular-nums', (snapshot?.threatScore ?? 0) > 60 ? 'text-rose-400' : 'text-emerald-400')}>{snapshot?.threatScore ?? 0}</p>
        </div>
      </div>

      {/* Demo app */}
      <div className={cn('rounded-xl border overflow-hidden transition-all duration-300', isUnderAttack ? 'border-rose-500/40' : 'border-slate-700')}>
        {/* Demo app navbar */}
        <nav className={cn('px-6 py-4 flex items-center justify-between transition-colors', isUnderAttack ? 'bg-rose-950/30' : 'bg-slate-900/80')}>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-400" />
            <span className="font-bold text-slate-100">TechStore</span>
            {isUnderAttack && <Badge tone="rose" dot>Under Attack</Badge>}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <button className="flex items-center gap-1.5 hover:text-sky-400"><Home className="w-4 h-4" /> Home</button>
            <button className="flex items-center gap-1.5 hover:text-sky-400"><ShoppingCart className="w-4 h-4" /> Cart {cartCount > 0 && <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-xs flex items-center justify-center">{cartCount}</span>}</button>
            <button className="flex items-center gap-1.5 hover:text-sky-400"><User className="w-4 h-4" /> Account</button>
          </div>
        </nav>

        {/* Attack overlay */}
        {isUnderAttack && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            <p className="text-xs text-rose-300">Service experiencing high traffic — mitigation active. Response times may be degraded.</p>
            <span className="ml-auto text-xs text-rose-400 font-mono">503 responses: {formatNumber((sample?.blocked ?? 0) * 2)}/s</span>
          </div>
        )}

        {/* Search bar */}
        <div className="bg-slate-950/50 px-6 py-4 border-b border-slate-800">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-slate-800/60 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        {/* Products grid */}
        <div className="bg-slate-950/30 p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Featured Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {DEMO_PRODUCTS.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase())).map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden hover:border-sky-500/40 transition-all duration-200 group">
                <div className="aspect-[4/3] overflow-hidden bg-slate-800">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium text-slate-200">{p.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-base font-bold text-sky-400">${p.price.toLocaleString()}</p>
                    <button onClick={() => setCartCount((c) => c + 1)} className="px-3 h-8 rounded-lg bg-sky-500 hover:bg-sky-400 text-sm font-medium text-slate-950 transition-colors">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo app footer */}
        <div className="bg-slate-900/80 border-t border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-slate-500">© 2026 TechStore Demo — Protected by SentinelDDoS</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={cn('w-2 h-2 rounded-full', isUnderAttack ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400')} />
              Server status: {isUnderAttack ? 'Degraded' : 'Operational'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent requests to this app */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-sky-400" />
          <p className="text-sm font-semibold text-slate-200">Incoming Requests to Demo App</p>
        </div>
        <div className="divide-y divide-slate-800/50 max-h-64 overflow-y-auto">
          {(snapshot?.recentRequests ?? []).slice(0, 20).map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-800/30">
              <span className={cn('w-2 h-2 rounded-full shrink-0', r.blocked ? 'bg-rose-400' : r.flagged ? 'bg-amber-400' : 'bg-emerald-400')} />
              <span className="font-mono text-xs text-slate-400 w-32 shrink-0">{r.ip}</span>
              <Badge tone="slate">{r.country}</Badge>
              <span className={cn('text-xs font-mono font-medium w-10', r.status === 200 ? 'text-emerald-400' : r.status === 403 ? 'text-rose-400' : 'text-amber-400')}>{r.status}</span>
              <span className="text-xs text-slate-400 truncate flex-1">{r.path}</span>
              <span className="text-xs text-slate-500 shrink-0">{r.latencyMs}ms</span>
              {r.blocked && <Badge tone="rose">Blocked</Badge>}
              {r.flagged && !r.blocked && <Badge tone="amber">Flagged</Badge>}
            </div>
          ))}
          {(snapshot?.recentRequests ?? []).length === 0 && <p className="px-5 py-6 text-sm text-slate-500 text-center">No requests yet</p>}
        </div>
      </div>
    </div>
  );
}
