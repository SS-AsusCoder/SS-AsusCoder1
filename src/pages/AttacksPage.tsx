import { useMemo, useState } from 'react';
import { ShieldAlert, Search, Download, Trash2, Filter } from 'lucide-react';
import { useEngine } from '../hooks/useEngine';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge, SeverityBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, Tr, Td, EmptyState } from '../components/ui/Table';
import { Input, Select } from '../components/ui/Input';
import { BarChart } from '../components/charts/BarChart';
import { formatNumber, toCSV, downloadFile, timeAgo } from '../lib/utils';
import { ATTACK_TYPES } from '../lib/constants';
import { supabase } from '../lib/supabase';

export function AttacksPage() {
  const { attacks, loadInitial } = useEngine();
  const { session } = useAuth();
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sevFilter, setSevFilter] = useState('all');

  const filtered = useMemo(() => {
    return attacks.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (sevFilter !== 'all' && a.severity !== sevFilter) return false;
      if (search && !a.source_ip.includes(search) && !a.type.includes(search.toLowerCase())) return false;
      return true;
    });
  }, [attacks, search, typeFilter, sevFilter]);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of attacks) map.set(a.type, (map.get(a.type) ?? 0) + 1);
    return [...map.entries()].map(([type, count]) => ({ label: type.replace('_', ' '), value: count }));
  }, [attacks]);

  const bySeverity = useMemo(() => {
    const map = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const a of attacks) map[a.severity]++;
    return map;
  }, [attacks]);

  const exportCsv = () => {
    const rows = filtered.map((a) => ({
      type: a.type, severity: a.severity, source_ip: a.source_ip, country: a.source_country ?? '',
      target: a.target, rps: a.requests_per_sec, pps: a.packets_per_sec, bandwidth: a.bandwidth_mbps,
      status: a.status, detected_by: a.detected_by, detected_at: a.detected_at,
    }));
    downloadFile(`attacks-${Date.now()}.csv`, toCSV(rows), 'text/csv');
    push('success', 'Export complete', `${rows.length} attacks exported to CSV`);
  };

  const clearAll = async () => {
    if (!session?.user) return;
    await supabase.from('attacks').delete().eq('user_id', session.user.id);
    await loadInitial();
    push('success', 'Cleared', 'All attack records deleted');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardBody><div><p className="text-xs text-slate-400">Total Attacks</p><p className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">{formatNumber(attacks.length)}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Critical</p><p className="text-2xl font-bold text-rose-400 mt-1 tabular-nums">{bySeverity.critical}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">High</p><p className="text-2xl font-bold text-orange-400 mt-1 tabular-nums">{bySeverity.high}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Active Now</p><p className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">{attacks.filter((a) => a.status === 'active').length}</p></div></CardBody></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Attacks by Type" icon={ShieldAlert} />
          <CardBody>
            {byType.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">No data</p> : <BarChart data={byType} height={180} color="rgb(244 63 94)" />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Attacks by Severity" icon={ShieldAlert} />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
                <div key={s} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
                  <SeverityBadge severity={s} />
                  <p className="text-2xl font-bold text-slate-100 mt-2 tabular-nums">{bySeverity[s]}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Attack Log"
          subtitle={`${filtered.length} of ${attacks.length} attacks`}
          icon={ShieldAlert}
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> Export</Button>
              <Button size="sm" variant="ghost" onClick={clearAll}><Trash2 className="w-3.5 h-3.5" /> Clear</Button>
            </div>
          }
        />
        <div className="px-5 py-3 border-b border-slate-800 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search IP or type..." className="pl-10 h-9" />
          </div>
          <Filter className="w-4 h-4 text-slate-500" />
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 w-40 text-xs">
            <option value="all">All Types</option>
            {ATTACK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} className="h-9 w-36 text-xs">
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="No attacks found" message="Try adjusting filters or run an attack simulation" />
        ) : (
          <Table headers={['Severity', 'Type', 'Source IP', 'Country', 'Target', 'Req/s', 'Pkt/s', 'Bandwidth', 'Status', 'Detected By', 'Time']}>
            {filtered.slice(0, 100).map((a) => (
              <Tr key={a.id}>
                <Td><SeverityBadge severity={a.severity} /></Td>
                <Td><span className="text-sm font-medium text-slate-200">{a.type.replace('_', ' ').toUpperCase()}</span></Td>
                <Td className="font-mono text-xs">{a.source_ip}</Td>
                <Td><Badge tone="slate">{a.source_country ?? '—'}</Badge></Td>
                <Td className="font-mono text-xs text-slate-400 max-w-[140px] truncate">{a.target}</Td>
                <Td className="tabular-nums">{formatNumber(a.requests_per_sec)}</Td>
                <Td className="tabular-nums">{formatNumber(a.packets_per_sec)}</Td>
                <Td className="tabular-nums">{Number(a.bandwidth_mbps).toFixed(1)} Mbps</Td>
                <Td><Badge tone={a.status === 'active' ? 'rose' : a.status === 'mitigated' ? 'emerald' : 'slate'}>{a.status}</Badge></Td>
                <Td className="text-xs text-slate-400">{a.detected_by}</Td>
                <Td className="text-xs text-slate-500 whitespace-nowrap">{timeAgo(a.detected_at)}</Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
