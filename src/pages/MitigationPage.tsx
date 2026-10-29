import { useMemo, useState } from 'react';
import { ShieldCheck, Ban, Plus, Download, Trash2, Power, Search, Unlock, Star } from 'lucide-react';
import { useEngine } from '../hooks/useEngine';
import { useToast } from '../context/ToastContext';
import { Card, CardBody } from '../components/ui/Card';
import { Badge, SeverityBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, Tr, Td, EmptyState } from '../components/ui/Table';
import { Input, Select, Field, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatDateTime, timeAgo, toCSV, downloadFile, cn } from '../lib/utils';
import { MITIGATION_ACTIONS, RULE_TYPES } from '../lib/constants';
import type { MitigationRule, RuleType, MitigationAction, Severity } from '../types';

export function MitigationPage() {
  const { blockedIps, rules, releaseBlockedIp, whitelistIp, blockIpManual, saveRule, deleteRule, toggleRule } = useEngine();
  const { push } = useToast();
  const [tab, setTab] = useState<'blocked' | 'rules'>('blocked');
  const [search, setSearch] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [blockIp, setBlockIp] = useState('');
  const [blockAction, setBlockAction] = useState<MitigationAction>('block');
  const [blockSev, setBlockSev] = useState<Severity>('high');
  const [blockReason, setBlockReason] = useState('');
  const [editRule, setEditRule] = useState<Partial<MitigationRule> | null>(null);

  const filteredBlocked = useMemo(() => {
    return blockedIps.filter((b) => (search ? b.ip_address.includes(search) : true));
  }, [blockedIps, search]);

  const exportCsv = () => {
    const rows = blockedIps.map((b) => ({ ip: b.ip_address, action: b.action, severity: b.severity, reason: b.reason, country: b.country ?? '', status: b.status, created: b.created_at, expires: b.expires_at ?? '' }));
    downloadFile(`blocked-ips-${Date.now()}.csv`, toCSV(rows), 'text/csv');
    push('success', 'Export complete', `${rows.length} IPs exported`);
  };

  const submitBlock = async () => {
    if (!blockIp) return;
    await blockIpManual(blockIp, blockAction, blockSev, blockReason || 'Manual block');
    push('success', 'IP blocked', `${blockIp} → ${blockAction}`);
    setShowBlockModal(false);
    setBlockIp(''); setBlockReason('');
  };

  const submitRule = async () => {
    if (!editRule?.name) return;
    await saveRule(editRule);
    push('success', editRule.id ? 'Rule updated' : 'Rule created', editRule.name);
    setShowRuleModal(false);
    setEditRule(null);
  };

  const openNewRule = () => {
    setEditRule({
      name: '', description: '', type: 'rate', action: 'rate_limit', threshold: 100, window_seconds: 60, enabled: true, priority: 100,
    });
    setShowRuleModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardBody><div><p className="text-xs text-slate-400">Active Blocks</p><p className="text-2xl font-bold text-rose-400 mt-1 tabular-nums">{blockedIps.filter((b) => b.status === 'active').length}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Total Blocked IPs</p><p className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">{blockedIps.length}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Active Rules</p><p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{rules.filter((r) => r.enabled).length}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Total Rules</p><p className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">{rules.length}</p></div></CardBody></Card>
      </div>

      <Card>
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-slate-800">
          <button onClick={() => setTab('blocked')} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors', tab === 'blocked' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200')}>
            Blocked IPs
          </button>
          <button onClick={() => setTab('rules')} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors', tab === 'rules' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200')}>
            Mitigation Rules
          </button>
        </div>

        {tab === 'blocked' ? (
          <>
            <div className="px-5 py-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search IP..." className="pl-10 h-9" />
              </div>
              <Button size="sm" variant="danger" onClick={() => setShowBlockModal(true)}><Plus className="w-3.5 h-3.5" /> Block IP</Button>
              <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> Export</Button>
            </div>
            {filteredBlocked.length === 0 ? (
              <EmptyState icon={Ban} title="No blocked IPs" message="Run an attack simulation to see mitigation in action" />
            ) : (
              <Table headers={['IP', 'Country', 'Action', 'Severity', 'Reason', 'Requests', 'Status', 'Created', 'Expires', 'Actions']}>
                {filteredBlocked.slice(0, 100).map((b) => (
                  <Tr key={b.id}>
                    <Td className="font-mono text-xs">{b.ip_address}</Td>
                    <Td><Badge tone="slate">{b.country ?? '—'}</Badge></Td>
                    <Td><Badge tone="sky">{b.action.replace('_', ' ')}</Badge></Td>
                    <Td><SeverityBadge severity={b.severity} /></Td>
                    <Td className="text-xs text-slate-400 max-w-[200px] truncate">{b.reason}</Td>
                    <Td className="tabular-nums">{b.request_count}</Td>
                    <Td><Badge tone={b.status === 'active' ? 'rose' : b.status === 'whitelisted' ? 'emerald' : 'slate'}>{b.status}</Badge></Td>
                    <Td className="text-xs text-slate-500 whitespace-nowrap">{timeAgo(b.created_at)}</Td>
                    <Td className="text-xs text-slate-500 whitespace-nowrap">{b.expires_at ? formatDateTime(b.expires_at) : 'permanent'}</Td>
                    <Td>
                      <div className="flex gap-1">
                        <button onClick={() => releaseBlockedIp(b.ip_address)} title="Release" className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400"><Unlock className="w-3.5 h-3.5" /></button>
                        <button onClick={() => whitelistIp(b.ip_address)} title="Whitelist" className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400"><Star className="w-3.5 h-3.5" /></button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Table>
            )}
          </>
        ) : (
          <>
            <div className="px-5 py-3 flex items-center justify-between gap-2">
              <p className="text-sm text-slate-400">{rules.length} mitigation rules configured</p>
              <Button size="sm" onClick={openNewRule}><Plus className="w-3.5 h-3.5" /> New Rule</Button>
            </div>
            {rules.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="No rules configured" message="Create detection and mitigation rules to protect your application" />
            ) : (
              <Table headers={['Priority', 'Name', 'Type', 'Action', 'Threshold', 'Window', 'Enabled', 'Actions']}>
                {rules.map((r) => (
                  <Tr key={r.id}>
                    <Td className="tabular-nums text-slate-400">{r.priority}</Td>
                    <Td>
                      <p className="text-sm font-medium text-slate-200">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.description}</p>
                    </Td>
                    <Td><Badge tone="violet">{RULE_TYPES.find((t) => t.value === r.type)?.label ?? r.type}</Badge></Td>
                    <Td><Badge tone="sky">{MITIGATION_ACTIONS.find((a) => a.value === r.action)?.label ?? r.action}</Badge></Td>
                    <Td className="tabular-nums">{r.threshold}</Td>
                    <Td className="tabular-nums">{r.window_seconds}s</Td>
                    <Td>
                      <button onClick={() => toggleRule(r.id, !r.enabled)} className={cn('w-10 h-5 rounded-full transition-colors relative', r.enabled ? 'bg-emerald-500' : 'bg-slate-700')}>
                        <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', r.enabled ? 'translate-x-5' : 'translate-x-0.5')} />
                      </button>
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditRule(r); setShowRuleModal(true); }} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400"><Power className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteRule(r.id)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Table>
            )}
          </>
        )}
      </Card>

      {/* Block IP Modal */}
      <Modal open={showBlockModal} onClose={() => setShowBlockModal(false)} title="Manually Block IP">
        <div className="space-y-4">
          <Field label="IP Address"><Input value={blockIp} onChange={(e) => setBlockIp(e.target.value)} placeholder="203.0.113.50" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Action">
              <Select value={blockAction} onChange={(e) => setBlockAction(e.target.value as MitigationAction)}>
                {MITIGATION_ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </Select>
            </Field>
            <Field label="Severity">
              <Select value={blockSev} onChange={(e) => setBlockSev(e.target.value as Severity)}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </Select>
            </Field>
          </div>
          <Field label="Reason"><Textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason for manual block..." rows={3} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowBlockModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={submitBlock}><Ban className="w-4 h-4" /> Block IP</Button>
          </div>
        </div>
      </Modal>

      {/* Rule Modal */}
      <Modal open={showRuleModal} onClose={() => setShowRuleModal(false)} title={editRule?.id ? 'Edit Rule' : 'New Mitigation Rule'} size="lg">
        {editRule && (
          <div className="space-y-4">
            <Field label="Rule Name"><Input value={editRule.name ?? ''} onChange={(e) => setEditRule({ ...editRule, name: e.target.value })} placeholder="High Request Rate" /></Field>
            <Field label="Description"><Input value={editRule.description ?? ''} onChange={(e) => setEditRule({ ...editRule, description: e.target.value })} placeholder="Block IPs exceeding 100 req/s" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Detection Type">
                <Select value={editRule.type} onChange={(e) => setEditRule({ ...editRule, type: e.target.value as RuleType })}>
                  {RULE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="Mitigation Action">
                <Select value={editRule.action} onChange={(e) => setEditRule({ ...editRule, action: e.target.value as MitigationAction })}>
                  {MITIGATION_ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Select>
              </Field>
              <Field label="Threshold"><Input type="number" value={editRule.threshold ?? 100} onChange={(e) => setEditRule({ ...editRule, threshold: +e.target.value })} /></Field>
              <Field label="Window (seconds)"><Input type="number" value={editRule.window_seconds ?? 60} onChange={(e) => setEditRule({ ...editRule, window_seconds: +e.target.value })} /></Field>
              <Field label="Priority"><Input type="number" value={editRule.priority ?? 100} onChange={(e) => setEditRule({ ...editRule, priority: +e.target.value })} /></Field>
              <Field label="Enabled">
                <Select value={editRule.enabled ? 'true' : 'false'} onChange={(e) => setEditRule({ ...editRule, enabled: e.target.value === 'true' })}>
                  <option value="true">Enabled</option><option value="false">Disabled</option>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowRuleModal(false)}>Cancel</Button>
              <Button onClick={submitRule}><ShieldCheck className="w-4 h-4" /> {editRule.id ? 'Update' : 'Create'} Rule</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
