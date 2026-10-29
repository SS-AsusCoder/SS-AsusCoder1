import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Clock, Globe, ShieldAlert, Download } from 'lucide-react';
import { useEngine } from '../hooks/useEngine';
import { useToast } from '../context/ToastContext';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { DonutChart, DonutLegend } from '../components/charts/DonutChart';
import { Heatmap } from '../components/charts/Heatmap';
import { Select } from '../components/ui/Input';
import { formatNumber, toCSV, downloadFile } from '../lib/utils';

import { ATTACK_TYPES, COUNTRIES } from '../lib/constants';

type Range = 'hour' | 'day' | 'week' | 'month';

export function AnalyticsPage() {
  const { attacks, blockedIps, samples, simulations } = useEngine();
  const { push } = useToast();
  const [range, setRange] = useState<Range>('hour');

  const trafficSeries = useMemo(() => [
    { name: 'Requests/s', color: 'rgb(56 189 248)', data: samples.map((s) => s.requestsPerSec) },
    { name: 'Blocked/s', color: 'rgb(244 63 94)', data: samples.map((s) => s.blocked) },
  ], [samples]);

  const attacksByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of attacks) map.set(a.type, (map.get(a.type) ?? 0) + 1);
    return [...map.entries()].map(([type, value]) => ({ label: type.replace('_', ' '), value, color: 'rgb(244 63 94)' }));
  }, [attacks]);

  const attacksByCountry = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of attacks) { if (a.source_country) map.set(a.source_country, (map.get(a.source_country) ?? 0) + 1); }
    return [...map.entries()].map(([country, value]) => ({ label: COUNTRIES.find((c) => c.code === country)?.name ?? country, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [attacks]);

  const severityDonut = useMemo(() => {
    const map = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const a of attacks) map[a.severity]++;
    return [
      { label: 'Low', value: map.low, color: 'rgb(52 211 153)' },
      { label: 'Medium', value: map.medium, color: 'rgb(251 191 36)' },
      { label: 'High', value: map.high, color: 'rgb(251 146 60)' },
      { label: 'Critical', value: map.critical, color: 'rgb(244 63 94)' },
    ];
  }, [attacks]);

  const heatmapData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data: { day: string; hour: number; value: number }[] = [];
    for (const day of days) {
      for (let h = 0; h < 24; h++) {
        const base = Math.floor(Math.random() * 5);
        const isPeak = h >= 9 && h <= 18 ? 2 : 1;
        data.push({ day, hour: h, value: base * isPeak + (Math.random() > 0.85 ? Math.floor(Math.random() * 15) : 0) });
      }
    }
    // Add real attack data
    for (const a of attacks) {
      const d = new Date(a.detected_at);
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      const h = d.getHours();
      const cell = data.find((c) => c.day === day && c.hour === h);
      if (cell) cell.value += 1;
    }
    return data;
  }, [attacks]);

  const mitigationRate = useMemo(() => {
    const total = attacks.length;
    const mitigated = attacks.filter((a) => a.status === 'mitigated').length;
    return total > 0 ? Math.round((mitigated / total) * 100) : 0;
  }, [attacks]);

  const exportReport = () => {
    const rows = attacks.map((a) => ({ type: a.type, severity: a.severity, source_ip: a.source_ip, country: a.source_country, status: a.status, detected_at: a.detected_at }));
    downloadFile(`analytics-${Date.now()}.csv`, toCSV(rows), 'text/csv');
    push('success', 'Export complete', `${rows.length} records exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Select value={range} onChange={(e) => setRange(e.target.value as Range)} className="w-40">
            <option value="hour">Last Hour</option><option value="day">Last Day</option><option value="week">Last Week</option><option value="month">Last Month</option>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={exportReport}><Download className="w-3.5 h-3.5" /> Export Analytics</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardBody><div><p className="text-xs text-slate-400">Total Attacks</p><p className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">{formatNumber(attacks.length)}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Blocked IPs</p><p className="text-2xl font-bold text-rose-400 mt-1 tabular-nums">{blockedIps.length}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Mitigation Rate</p><p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{mitigationRate}%</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Simulations Run</p><p className="text-2xl font-bold text-sky-400 mt-1 tabular-nums">{simulations.length}</p></div></CardBody></Card>
      </div>

      <Card>
        <CardHeader title="Traffic Trend" subtitle="Requests and blocked traffic over time" icon={TrendingUp} />
        <CardBody><LineChart series={trafficSeries} height={240} yLabel="req/s" /></CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Attacks by Type" icon={ShieldAlert} />
          <CardBody>{attacksByType.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">No data</p> : <BarChart data={attacksByType} height={200} color="rgb(244 63 94)" />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Severity Distribution" icon={ShieldAlert} />
          <CardBody>
            {attacks.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">No data</p> : (
              <div className="flex items-center gap-4">
                <DonutChart segments={severityDonut} center={formatNumber(attacks.length)} />
                <div className="flex-1"><DonutLegend segments={severityDonut} /></div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Attack Heatmap" subtitle="Attack frequency by day and hour" icon={Clock} />
        <CardBody><Heatmap data={heatmapData} /></CardBody>
      </Card>

      <Card>
        <CardHeader title="Top Attack Source Countries" icon={Globe} />
        <CardBody>
          {attacksByCountry.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">No data</p> : <BarChart data={attacksByCountry} height={220} horizontal color="rgb(167 139 250)" />}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Attack Type Reference" subtitle="All supported attack categories" icon={BarChart3} />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {ATTACK_TYPES.map((t) => {
              const count = attacks.filter((a) => a.type === t.value).length;
              return (
                <div key={t.value} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
                  <p className="text-xs font-medium text-slate-200">{t.label}</p>
                  <p className="text-lg font-bold text-slate-100 mt-1 tabular-nums">{count}</p>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
