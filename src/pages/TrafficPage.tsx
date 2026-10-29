import { useMemo, useState } from 'react';
import { Activity, Network, Zap, Ban, Globe, Filter, Pause, Play } from 'lucide-react';
import { useEngine } from '../hooks/useEngine';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { LineChart } from '../components/charts/LineChart';
import { Badge } from '../components/ui/Badge';
import { Table, Tr, Td, EmptyState } from '../components/ui/Table';
import { Select } from '../components/ui/Input';
import { formatBytes, formatNumber, formatTime, cn } from '../lib/utils';

export function TrafficPage() {
  const { sample, snapshot, samples } = useEngine();
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<'all' | 'blocked' | 'flagged'>('all');

  const series = useMemo(
    () => [
      { name: 'Requests/s', color: 'rgb(56 189 248)', data: samples.map((s) => s.requestsPerSec) },
      { name: 'Packets/s', color: 'rgb(167 139 250)', data: samples.map((s) => s.packetsPerSec) },
      { name: 'Blocked/s', color: 'rgb(244 63 94)', data: samples.map((s) => s.blocked) },
    ],
    [samples],
  );

  const bwSeries = useMemo(() => [{ name: 'Bandwidth (Mbps)', color: 'rgb(52 211 153)', data: samples.map((s) => s.bandwidthMbps) }], [samples]);

  const requests = useMemo(() => {
    const all = snapshot?.recentRequests ?? [];
    if (filter === 'blocked') return all.filter((r) => r.blocked);
    if (filter === 'flagged') return all.filter((r) => r.flagged);
    return all;
  }, [snapshot?.recentRequests, filter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Requests / sec" value={formatNumber(sample?.requestsPerSec ?? 0)} icon={Activity} tone="sky" />
        <StatCard label="Packets / sec" value={formatNumber(sample?.packetsPerSec ?? 0)} icon={Zap} tone="violet" />
        <StatCard label="Bandwidth" value={formatBytes(sample?.bandwidthMbps ?? 0)} icon={Network} tone="emerald" />
        <StatCard label="Blocked / sec" value={formatNumber(sample?.blocked ?? 0)} icon={Ban} tone="rose" />
      </div>

      <Card>
        <CardHeader
          title="Real-time Traffic Graph"
          subtitle="Requests, packets and blocked traffic per second"
          icon={Activity}
          action={
            <button
              onClick={() => setPaused((p) => !p)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-slate-700 hover:border-sky-500 text-xs text-slate-300 hover:text-sky-400 transition-colors"
            >
              {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
          }
        />
        <CardBody>
          <LineChart series={series} height={240} yLabel="req/s" />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Bandwidth Utilization" subtitle="Network throughput (Mbps)" icon={Network} />
          <CardBody>
            <LineChart series={bwSeries} height={180} yLabel="Mbps" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Geographic Distribution" subtitle="Requests by country" icon={Globe} />
          <CardBody>
            {(snapshot?.countryDist ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Awaiting data...</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(snapshot?.countryDist ?? []).map((c) => {
                  const max = Math.max(...(snapshot?.countryDist ?? []).map((x) => x.count), 1);
                  return (
                    <div key={c.country} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 w-10">{c.country}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${(c.count / max) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-300 tabular-nums w-12 text-right">{c.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Live Request Stream"
          subtitle="Real-time incoming requests"
          icon={Activity}
          action={
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <Select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | 'blocked' | 'flagged')} className="h-8 w-32 text-xs">
                <option value="all">All</option>
                <option value="blocked">Blocked</option>
                <option value="flagged">Flagged</option>
              </Select>
            </div>
          }
        />
        {requests.length === 0 ? (
          <EmptyState icon={Activity} title="No requests yet" message="Traffic will appear here as the engine processes requests" />
        ) : (
          <Table headers={['Time', 'IP', 'Country', 'Method', 'Path', 'Status', 'Size', 'Latency', 'Flags']}>
            {requests.slice(0, 50).map((r) => (
              <Tr key={r.id}>
                <Td className="text-xs text-slate-500 font-mono whitespace-nowrap">{formatTime(r.ts)}</Td>
                <Td className="font-mono text-xs">{r.ip}</Td>
                <Td><Badge tone="slate">{r.country}</Badge></Td>
                <Td><span className="text-xs font-mono text-slate-400">{r.method}</span></Td>
                <Td className="font-mono text-xs text-slate-300 max-w-[200px] truncate">{r.path}</Td>
                <Td>
                  <span className={cn('text-xs font-mono font-medium', r.status === 200 ? 'text-emerald-400' : r.status === 403 ? 'text-rose-400' : r.status === 429 ? 'text-amber-400' : 'text-orange-400')}>
                    {r.status}
                  </span>
                </Td>
                <Td className="text-xs tabular-nums">{formatNumber(r.size)} B</Td>
                <Td className="text-xs tabular-nums text-slate-400">{r.latencyMs}ms</Td>
                <Td>
                  <div className="flex gap-1">
                    {r.blocked && <Badge tone="rose">Blocked</Badge>}
                    {r.flagged && !r.blocked && <Badge tone="amber">Flagged</Badge>}
                    {!r.blocked && !r.flagged && <Badge tone="emerald">OK</Badge>}
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
