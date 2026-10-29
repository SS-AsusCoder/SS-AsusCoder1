import { useMemo, useState, type ComponentType } from 'react';
import { FileText, Download, Printer, ShieldAlert, Ban, Activity, Server, FileBarChart, FileSpreadsheet } from 'lucide-react';
import { useEngine } from '../hooks/useEngine';
import { useToast } from '../context/ToastContext';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, SeverityBadge } from '../components/ui/Badge';
import { formatDateTime, formatNumber, toCSV, downloadFile, timeAgo } from '../lib/utils';
import { ATTACK_TYPES } from '../lib/constants';

type ReportType = 'attack_summary' | 'mitigation_summary' | 'blocked_ips' | 'traffic' | 'system_health' | 'threat';

export function ReportsPage() {
  const { attacks, blockedIps, samples, simulations } = useEngine();
  const { push } = useToast();
  const [selected, setSelected] = useState<ReportType>('attack_summary');

  const reports: { id: ReportType; title: string; description: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: 'attack_summary', title: 'Attack Summary Report', description: 'Overview of all detected attacks', icon: ShieldAlert },
    { id: 'mitigation_summary', title: 'Mitigation Summary', description: 'Actions taken by mitigation engine', icon: Ban },
    { id: 'blocked_ips', title: 'Blocked IP Report', description: 'All blocked and rate-limited IPs', icon: Ban },
    { id: 'traffic', title: 'Traffic Report', description: 'Network traffic statistics', icon: Activity },
    { id: 'system_health', title: 'System Health Report', description: 'CPU, RAM and server metrics', icon: Server },
    { id: 'threat', title: 'Threat Intelligence Report', description: 'Threat score and risk analysis', icon: FileBarChart },
  ];

  const stats = useMemo(() => {
    const byType = new Map<string, number>();
    const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const a of attacks) {
      byType.set(a.type, (byType.get(a.type) ?? 0) + 1);
      bySeverity[a.severity]++;
    }
    return { byType: [...byType.entries()], bySeverity, total: attacks.length, mitigated: attacks.filter((a) => a.status === 'mitigated').length };
  }, [attacks]);

  const exportCsv = () => {
    let rows: Record<string, unknown>[] = [];
    if (selected === 'attack_summary' || selected === 'threat') rows = attacks.map((a) => ({ type: a.type, severity: a.severity, source_ip: a.source_ip, country: a.source_country, status: a.status, detected_at: a.detected_at }));
    else if (selected === 'mitigation_summary') rows = attacks.map((a) => ({ type: a.type, action: 'mitigated', severity: a.severity, source_ip: a.source_ip, status: a.status }));
    else if (selected === 'blocked_ips') rows = blockedIps.map((b) => ({ ip: b.ip_address, action: b.action, severity: b.severity, reason: b.reason, status: b.status, created: b.created_at }));
    else if (selected === 'traffic') rows = samples.map((s) => ({ time: new Date(s.t).toISOString(), rps: s.requestsPerSec, pps: s.packetsPerSec, bandwidth: s.bandwidthMbps, blocked: s.blocked }));
    else if (selected === 'system_health') rows = samples.map((s) => ({ time: new Date(s.t).toISOString(), cpu: s.cpu, ram: s.ram, connections: s.uniqueIps }));
    downloadFile(`report-${selected}-${Date.now()}.csv`, toCSV(rows), 'text/csv');
    push('success', 'CSV exported', `${rows.length} records`);
  };

  const exportJson = () => {
    const data = { reportType: selected, generatedAt: new Date().toISOString(), stats, attacks: attacks.slice(0, 50), blockedIps: blockedIps.slice(0, 50) };
    downloadFile(`report-${selected}-${Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json');
    push('success', 'JSON exported', 'Report downloaded');
  };

  const printReport = () => {
    window.print();
    push('info', 'Print dialog', 'Use your browser print dialog to save as PDF');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r.id)}
            className={`text-left rounded-xl border p-5 transition-all duration-200 ${selected === r.id ? 'border-sky-500/50 bg-sky-500/5 shadow-lg shadow-sky-500/5' : 'border-slate-700/50 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900/80'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${selected === r.id ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
                <r.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100">{r.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader
          title={reports.find((r) => r.id === selected)?.title ?? 'Report'}
          subtitle={`Generated ${formatDateTime(new Date().toISOString())}`}
          icon={FileText}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportCsv}><FileSpreadsheet className="w-3.5 h-3.5" /> CSV</Button>
              <Button size="sm" variant="outline" onClick={exportJson}><Download className="w-3.5 h-3.5" /> JSON</Button>
              <Button size="sm" variant="ghost" onClick={printReport}><Printer className="w-3.5 h-3.5" /> Print</Button>
            </div>
          }
        />
        <CardBody className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
              <p className="text-xs text-slate-500">Total Attacks</p>
              <p className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">{formatNumber(stats.total)}</p>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
              <p className="text-xs text-slate-500">Mitigated</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{stats.mitigated}</p>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
              <p className="text-xs text-slate-500">Blocked IPs</p>
              <p className="text-2xl font-bold text-rose-400 mt-1 tabular-nums">{blockedIps.length}</p>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
              <p className="text-xs text-slate-500">Simulations</p>
              <p className="text-2xl font-bold text-sky-400 mt-1 tabular-nums">{simulations.length}</p>
            </div>
          </div>

          {/* Severity breakdown */}
          <div>
            <p className="text-sm font-semibold text-slate-200 mb-3">Severity Breakdown</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
                <div key={s} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
                  <SeverityBadge severity={s} />
                  <p className="text-2xl font-bold text-slate-100 mt-2 tabular-nums">{stats.bySeverity[s]}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Attack type breakdown */}
          <div>
            <p className="text-sm font-semibold text-slate-200 mb-3">Attacks by Type</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {ATTACK_TYPES.map((t) => {
                const count = stats.byType.find(([type]) => type === t.value)?.[1] ?? 0;
                return (
                  <div key={t.value} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
                    <p className="text-xs font-medium text-slate-200 truncate">{t.label}</p>
                    <p className="text-lg font-bold text-slate-100 mt-1 tabular-nums">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent attacks table */}
          <div>
            <p className="text-sm font-semibold text-slate-200 mb-3">Recent Attack Events</p>
            <div className="rounded-lg border border-slate-700/50 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-700/50 bg-slate-800/30">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Severity</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Type</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Source IP</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Status</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Detected</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-800/50">
                  {attacks.slice(0, 10).map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2"><SeverityBadge severity={a.severity} /></td>
                      <td className="px-4 py-2 text-slate-200">{a.type.replace('_', ' ').toUpperCase()}</td>
                      <td className="px-4 py-2 font-mono text-xs">{a.source_ip}</td>
                      <td className="px-4 py-2"><Badge tone={a.status === 'mitigated' ? 'emerald' : 'rose'}>{a.status}</Badge></td>
                      <td className="px-4 py-2 text-xs text-slate-500">{timeAgo(a.detected_at)}</td>
                    </tr>
                  ))}
                  {attacks.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No attack data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
