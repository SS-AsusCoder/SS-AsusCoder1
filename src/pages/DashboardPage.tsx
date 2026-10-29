import { useMemo, type ComponentType } from 'react';
import { Activity, ShieldAlert, ShieldCheck, Zap, Globe, Cpu, MemoryStick, Server, AlertTriangle, Ban, Network, Gauge as GaugeIcon } from 'lucide-react';
import { useEngine } from '../hooks/useEngine';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge, SeverityBadge } from '../components/ui/Badge';
import { LineChart } from '../components/charts/LineChart';
import { DonutChart, DonutLegend } from '../components/charts/DonutChart';
import { Gauge } from '../components/charts/Gauge';
import { BarChart } from '../components/charts/BarChart';
import { formatNumber, formatBytes, timeAgo, cn } from '../lib/utils';
import { COUNTRIES } from '../lib/constants';

export function DashboardPage() {
  const { sample, snapshot, samples, attacks, alerts, blockedIps, attackActive, attackType, acknowledgeAlert } = useEngine();

  const trafficSeries = useMemo(() => {
    const rps = samples.map((s) => s.requestsPerSec);
    const blocked = samples.map((s) => s.blocked);
    return [
      { name: 'Requests/s', color: 'rgb(56 189 248)', data: rps },
      { name: 'Blocked/s', color: 'rgb(244 63 94)', data: blocked },
    ];
  }, [samples]);

  const countrySegments = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of snapshot?.countryDist ?? []) map.set(c.country, c.count);
    const colors = ['rgb(56 189 248)', 'rgb(52 211 153)', 'rgb(251 191 36)', 'rgb(251 113 133)', 'rgb(167 139 250)', 'rgb(251 146 60)'];
    return [...map.entries()].slice(0, 6).map(([country, value], i) => ({
      label: COUNTRIES.find((c) => c.code === country)?.name ?? country,
      value,
      color: colors[i % colors.length],
    }));
  }, [snapshot?.countryDist]);

  const statusSegments = useMemo(() => {
    const colors: Record<number, string> = { 200: 'rgb(52 211 153)', 403: 'rgb(244 63 94)', 429: 'rgb(251 191 36)', 503: 'rgb(251 146 60)' };
    return (snapshot?.statusDist ?? []).map((s) => ({ label: `${s.status}`, value: s.count, color: colors[s.status] ?? 'rgb(100 116 139)' }));
  }, [snapshot?.statusDist]);

  const topAttackers = useMemo(() => (snapshot?.topIps ?? []).slice(0, 5), [snapshot?.topIps]);

  return (
    <div className="space-y-6">
      {/* Attack banner */}
      {attackActive && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 flex items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-rose-200">ACTIVE ATTACK IN PROGRESS — {(attackType ?? '').toUpperCase()} FLOOD</p>
            <p className="text-xs text-rose-300/80 mt-0.5">Mitigation engine is responding. Monitor blocked IPs and traffic graphs below.</p>
          </div>
          <Badge tone="rose" dot>LIVE</Badge>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Requests / sec" value={formatNumber(sample?.requestsPerSec ?? 0)} icon={Activity} tone="sky" spark={samples.map((s) => s.requestsPerSec)} />
        <StatCard label="Packets / sec" value={formatNumber(sample?.packetsPerSec ?? 0)} icon={Zap} tone="violet" spark={samples.map((s) => s.packetsPerSec)} />
        <StatCard label="Bandwidth" value={formatBytes(sample?.bandwidthMbps ?? 0)} icon={Network} tone="emerald" spark={samples.map((s) => s.bandwidthMbps)} />
        <StatCard label="Blocked / sec" value={formatNumber(sample?.blocked ?? 0)} icon={Ban} tone="rose" spark={samples.map((s) => s.blocked)} />
      </div>

      {/* Traffic + threat score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Live Traffic Monitor" subtitle="Requests and blocked traffic per second" icon={Activity} action={<Badge tone={attackActive ? 'rose' : 'emerald'} dot>{attackActive ? 'Under Attack' : 'Normal'}</Badge>} />
          <CardBody>
            <LineChart series={trafficSeries} height={220} yLabel="req/s" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Threat Score" subtitle="Composite risk indicator" icon={GaugeIcon} />
          <CardBody className="flex flex-col items-center justify-center gap-4">
            <Gauge value={snapshot?.threatScore ?? 0} label="Current Threat Level" />
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-center">
                <p className="text-xl font-bold text-rose-400 tabular-nums">{snapshot?.activeAttacks ?? 0}</p>
                <p className="text-xs text-slate-500 mt-0.5">Active Attacks</p>
              </div>
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-center">
                <p className="text-xl font-bold text-amber-400 tabular-nums">{blockedIps.filter((b) => b.status === 'active').length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Blocked IPs</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Server health + country dist + status codes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Server Health" subtitle="CPU & memory utilization" icon={Server} />
          <CardBody className="space-y-4">
            <HealthBar label="CPU Usage" value={sample?.cpu ?? 0} icon={Cpu} />
            <HealthBar label="RAM Usage" value={sample?.ram ?? 0} icon={MemoryStick} />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <p className="text-xs text-slate-400">Connections</p>
                </div>
                <p className="text-lg font-bold text-slate-100 mt-1 tabular-nums">{formatNumber(snapshot?.connectionCount ?? 0)}</p>
              </div>
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-slate-400">Unique IPs</p>
                </div>
                <p className="text-lg font-bold text-slate-100 mt-1 tabular-nums">{formatNumber(sample?.uniqueIps ?? 0)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Traffic by Country" subtitle="Top source countries" icon={Globe} />
          <CardBody>
            {countrySegments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Awaiting traffic data...</p>
            ) : (
              <div className="flex items-center gap-4">
                <DonutChart segments={countrySegments} center={formatNumber(countrySegments.reduce((a, s) => a + s.value, 0))} />
                <div className="flex-1 min-w-0">
                  <DonutLegend segments={countrySegments} />
                </div>
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Response Status" subtitle="HTTP status distribution" icon={ShieldCheck} />
          <CardBody>
            {statusSegments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Awaiting traffic data...</p>
            ) : (
              <div className="flex items-center gap-4">
                <DonutChart segments={statusSegments} center={formatNumber(statusSegments.reduce((a, s) => a + s.value, 0))} />
                <div className="flex-1 min-w-0">
                  <DonutLegend segments={statusSegments} />
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Top attackers + recent attacks + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Top Attack Sources" subtitle="Most active IPs" icon={ShieldAlert} />
          <CardBody>
            {topAttackers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No attack sources detected</p>
            ) : (
              <div className="space-y-3">
                {topAttackers.map((ip, i) => (
                  <div key={ip.ip} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-slate-200 truncate">{ip.ip}</p>
                      <p className="text-xs text-slate-500">{ip.country} · {formatNumber(ip.count)} req</p>
                    </div>
                    {ip.blocked ? <Badge tone="rose">Blocked</Badge> : <Badge tone="amber">Flagged</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent Attacks" subtitle="Latest detected events" icon={AlertTriangle} />
          <CardBody>
            {attacks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No attacks detected yet</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {attacks.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2 border-b border-slate-800/50 last:border-0">
                    <SeverityBadge severity={a.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{a.type.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-xs text-slate-500 font-mono truncate">{a.source_ip}</p>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">{timeAgo(a.detected_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Alert Center" subtitle="Recent security alerts" icon={AlertTriangle} />
          <CardBody>
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No alerts</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {alerts.slice(0, 8).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => acknowledgeAlert(a.id)}
                    className={cn('w-full text-left flex items-start gap-2 py-2 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 rounded px-1 transition-colors', !a.acknowledged && 'bg-slate-800/20')}
                  >
                    <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', { info: 'bg-sky-400', warning: 'bg-amber-400', critical: 'bg-rose-400', success: 'bg-emerald-400' }[a.level])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{a.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{a.message}</p>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">{timeAgo(a.created_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Top paths bar chart */}
      <Card>
        <CardHeader title="Top Requested Paths" subtitle="Most targeted endpoints" icon={Activity} />
        <CardBody>
          {(snapshot?.topPaths ?? []).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Awaiting traffic data...</p>
          ) : (
            <BarChart data={(snapshot?.topPaths ?? []).map((p) => ({ label: p.path, value: p.count }))} color="rgb(56 189 248)" height={180} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function HealthBar({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string }> }) {
  const pct = Math.min(value, 100);
  const color = pct < 50 ? 'bg-emerald-500' : pct < 80 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">{label}</span>
        </div>
        <span className="text-sm font-bold text-slate-100 tabular-nums">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
