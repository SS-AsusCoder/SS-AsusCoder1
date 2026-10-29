import { useEffect, useMemo, useState } from 'react';
import { ScrollText, Search, Download, Filter, Shield, User, Server, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, Tr, Td, EmptyState } from '../components/ui/Table';
import { Input, Select } from '../components/ui/Input';
import { formatDateTime, toCSV, downloadFile, cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types';

export function LogsPage() {
  const { session } = useAuth();
  const { push } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data } = await supabase.from('audit_logs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(500);
    setLogs((data as AuditLog[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [session?.user]);

  const actors = useMemo(() => [...new Set(logs.map((l) => l.actor))], [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (actorFilter !== 'all' && l.actor !== actorFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (l.action?.toLowerCase().includes(q) || l.target?.toLowerCase().includes(q) || l.details?.toLowerCase().includes(q) || l.ip_address?.includes(q));
      }
      return true;
    });
  }, [logs, search, actorFilter]);

  const exportCsv = () => {
    const rows = filtered.map((l) => ({ actor: l.actor, action: l.action, target: l.target ?? '', details: l.details ?? '', ip: l.ip_address ?? '', created_at: l.created_at }));
    downloadFile(`audit-logs-${Date.now()}.csv`, toCSV(rows), 'text/csv');
    push('success', 'Export complete', `${rows.length} log entries exported`);
  };

  const actorIcon = (actor: string) => {
    if (actor.includes('detection')) return Shield;
    if (actor.includes('mitigation')) return Shield;
    if (actor === 'user') return User;
    if (actor.includes('system')) return Server;
    return AlertTriangle;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardBody><div><p className="text-xs text-slate-400">Total Log Entries</p><p className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">{logs.length}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Detection Events</p><p className="text-2xl font-bold text-sky-400 mt-1 tabular-nums">{logs.filter((l) => l.actor.includes('detection')).length}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Mitigation Actions</p><p className="text-2xl font-bold text-rose-400 mt-1 tabular-nums">{logs.filter((l) => l.actor.includes('mitigation')).length}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">User Actions</p><p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{logs.filter((l) => l.actor === 'user').length}</p></div></CardBody></Card>
      </div>

      <Card>
        <CardHeader title="Audit Log" subtitle={`${filtered.length} of ${logs.length} entries`} icon={ScrollText} action={<Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> Export</Button>} />
        <div className="px-5 py-3 border-b border-slate-800 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search action, target, IP..." className="pl-10 h-9" />
          </div>
          <Filter className="w-4 h-4 text-slate-500" />
          <Select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} className="h-9 w-44 text-xs">
            <option value="all">All Actors</option>
            {actors.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500 text-center py-12">Loading logs...</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ScrollText} title="No log entries" message="Audit logs will appear as the system operates" />
        ) : (
          <Table headers={['Time', 'Actor', 'Action', 'Target', 'Details', 'IP']}>
            {filtered.slice(0, 200).map((l) => {
              const Icon = actorIcon(l.actor);
              return (
                <Tr key={l.id}>
                  <Td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(l.created_at)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Icon className={cn('w-3.5 h-3.5', l.actor.includes('detection') ? 'text-sky-400' : l.actor.includes('mitigation') ? 'text-rose-400' : l.actor === 'user' ? 'text-emerald-400' : 'text-slate-400')} />
                      <span className="text-xs text-slate-300">{l.actor}</span>
                    </div>
                  </Td>
                  <Td><Badge tone={l.actor.includes('mitigation') ? 'rose' : l.actor.includes('detection') ? 'sky' : 'slate'}>{l.action.replace(/_/g, ' ')}</Badge></Td>
                  <Td className="font-mono text-xs text-slate-400 max-w-[180px] truncate">{l.target ?? '—'}</Td>
                  <Td className="text-xs text-slate-400 max-w-[280px] truncate">{l.details ?? '—'}</Td>
                  <Td className="font-mono text-xs text-slate-500">{l.ip_address ?? '—'}</Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}
