import { useEffect, useRef, useState, type ComponentType } from 'react';
import { FlaskConical, Play, Pause, Square, Zap, Activity, Ban, ShieldAlert, Clock, Gauge, History } from 'lucide-react';
import { useEngine } from '../hooks/useEngine';
import { useToast } from '../context/ToastContext';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Input';
import { Table, Tr, Td, EmptyState } from '../components/ui/Table';
import { LineChart } from '../components/charts/LineChart';
import { ATTACK_TYPES, DEMO_PATHS } from '../lib/constants';
import { formatNumber, formatDateTime, cn } from '../lib/utils';
import type { AttackType, SimConfig } from '../types';

export function SimulatorPage() {
  const { startAttack, stopAttack, attackActive, attackType, samples, simulations, saveSimulation } = useEngine();
  const { push } = useToast();
  const [config, setConfig] = useState<SimConfig>({
    attackType: 'http_flood',
    target: '/demo',
    concurrency: 50,
    durationSeconds: 30,
    requestsPerSecond: 200,
    randomIps: true,
    name: 'HTTP Flood Test',
  });
  const [elapsed, setElapsed] = useState(0);
  const [runStats, setRunStats] = useState({ total: 0, blocked: 0, detected: 0 });
  const startRef = useRef<number | null>(null);
  const simIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!attackActive) return;
    const id = setInterval(() => {
      if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [attackActive]);

  useEffect(() => {
    if (attackActive) {
      setRunStats((s) => ({
        total: s.total + (samples[samples.length - 1]?.requestsPerSec ?? 0),
        blocked: s.blocked + (samples[samples.length - 1]?.blocked ?? 0),
        detected: s.detected + (samples[samples.length - 1]?.isAttack ? 1 : 0),
      }));
    }
  }, [samples, attackActive]);

  const handleStart = async () => {
    setElapsed(0);
    setRunStats({ total: 0, blocked: 0, detected: 0 });
    startRef.current = Date.now();
    const intensity = Math.max(0.5, config.requestsPerSecond / 100);
    startAttack(config.attackType, intensity, config.target, config.durationSeconds * 1000, config.randomIps);
    const data = await saveSimulation({
      name: config.name,
      attack_type: config.attackType,
      target: config.target,
      concurrency: config.concurrency,
      duration_seconds: config.durationSeconds,
      requests_per_second: config.requestsPerSecond,
      random_ips: config.randomIps,
      status: 'running',
      started_at: new Date().toISOString(),
    } as never);
    if (data) simIdRef.current = data.id;
    push('error', 'Attack simulation started', `${config.attackType.toUpperCase()} flood targeting ${config.target}`);
  };

  const handleStop = async () => {
    stopAttack();
    if (simIdRef.current) {
      await saveSimulation({
        name: config.name,
        attack_type: config.attackType,
        target: config.target,
        concurrency: config.concurrency,
        duration_seconds: config.durationSeconds,
        requests_per_second: config.requestsPerSecond,
        random_ips: config.randomIps,
        status: 'stopped',
        total_requests: runStats.total,
        blocked_requests: runStats.blocked,
        detected_attacks: runStats.detected,
        started_at: new Date(Date.now() - elapsed * 1000).toISOString(),
        ended_at: new Date().toISOString(),
      } as never);
    }
    push('success', 'Attack simulation stopped', `Generated ${formatNumber(runStats.total)} requests, ${formatNumber(runStats.blocked)} blocked`);
    startRef.current = null;
  };

  const progress = attackActive ? Math.min((elapsed / config.durationSeconds) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {attackActive && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
              <p className="text-sm font-bold text-rose-200">SIMULATION RUNNING — {(attackType ?? '').toUpperCase()} FLOOD</p>
            </div>
            <Badge tone="rose" dot>{elapsed}s / {config.durationSeconds}s</Badge>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Attack Simulator Configuration" subtitle="Generate synthetic DDoS traffic against the demo app" icon={FlaskConical} />
          <CardBody className="space-y-4">
            <Field label="Simulation Name"><Input value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} placeholder="HTTP Flood Test" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Attack Type">
                <Select value={config.attackType} onChange={(e) => setConfig({ ...config, attackType: e.target.value as AttackType })}>
                  {ATTACK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="Target Endpoint">
                <Select value={config.target} onChange={(e) => setConfig({ ...config, target: e.target.value })}>
                  {DEMO_PATHS.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Concurrency (connections)"><Input type="number" min={1} max={500} value={config.concurrency} onChange={(e) => setConfig({ ...config, concurrency: +e.target.value })} /></Field>
              <Field label="Duration (seconds)"><Input type="number" min={5} max={600} value={config.durationSeconds} onChange={(e) => setConfig({ ...config, durationSeconds: +e.target.value })} /></Field>
              <Field label="Requests / second"><Input type="number" min={10} max={5000} value={config.requestsPerSecond} onChange={(e) => setConfig({ ...config, requestsPerSecond: +e.target.value })} /></Field>
              <Field label="Random Source IPs">
                <Select value={config.randomIps ? 'true' : 'false'} onChange={(e) => setConfig({ ...config, randomIps: e.target.value === 'true' })}>
                  <option value="true">Yes (distributed)</option><option value="false">No (single subnet)</option>
                </Select>
              </Field>
            </div>
            <div className="flex gap-2 pt-2">
              {!attackActive ? (
                <Button variant="danger" onClick={handleStart}><Play className="w-4 h-4" /> Launch Attack</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => { stopAttack(); }}><Pause className="w-4 h-4" /> Pause</Button>
                  <Button variant="danger" onClick={handleStop}><Square className="w-4 h-4" /> Stop</Button>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-start gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Simulations run entirely in-browser against the protected demo app. No external traffic is generated.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Live Run Stats" subtitle="Current simulation metrics" icon={Gauge} />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <StatRow icon={Activity} label="Total Requests" value={formatNumber(runStats.total)} tone="sky" />
              <StatRow icon={Ban} label="Blocked Requests" value={formatNumber(runStats.blocked)} tone="rose" />
              <StatRow icon={ShieldAlert} label="Attacks Detected" value={formatNumber(runStats.detected)} tone="amber" />
              <StatRow icon={Clock} label="Elapsed" value={`${elapsed}s`} tone="violet" />
            </div>
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2">Traffic during simulation</p>
              <LineChart series={[{ name: 'req/s', color: 'rgb(244 63 94)', data: samples.map((s) => s.requestsPerSec) }, { name: 'blocked/s', color: 'rgb(251 191 36)', data: samples.map((s) => s.blocked) }]} height={120} />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Attack Types Reference" subtitle="Supported DDoS simulation types" icon={Zap} />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ATTACK_TYPES.map((t) => (
              <div key={t.value} className={cn('rounded-lg border p-3 transition-colors cursor-pointer', config.attackType === t.value ? 'border-sky-500/40 bg-sky-500/5' : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600')} onClick={() => setConfig({ ...config, attackType: t.value, name: `${t.label} Test` })}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-200">{t.label}</p>
                  {config.attackType === t.value && <Badge tone="sky">selected</Badge>}
                </div>
                <p className="text-xs text-slate-500">{t.description}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Simulation History" subtitle="Previous attack simulations" icon={History} />
        {simulations.length === 0 ? (
          <EmptyState icon={History} title="No simulations yet" message="Launch an attack simulation to see results here" />
        ) : (
          <Table headers={['Name', 'Type', 'Target', 'Concurrency', 'Duration', 'RPS', 'Total Req', 'Blocked', 'Detected', 'Status', 'Started']}>
            {simulations.map((s) => (
              <Tr key={s.id}>
                <Td className="text-sm font-medium text-slate-200">{s.name}</Td>
                <Td><Badge tone="violet">{s.attack_type.replace('_', ' ')}</Badge></Td>
                <Td className="font-mono text-xs text-slate-400">{s.target}</Td>
                <Td className="tabular-nums">{s.concurrency}</Td>
                <Td className="tabular-nums">{s.duration_seconds}s</Td>
                <Td className="tabular-nums">{s.requests_per_second}</Td>
                <Td className="tabular-nums">{formatNumber(s.total_requests)}</Td>
                <Td className="tabular-nums text-rose-400">{formatNumber(s.blocked_requests)}</Td>
                <Td className="tabular-nums text-amber-400">{s.detected_attacks}</Td>
                <Td><Badge tone={s.status === 'completed' ? 'emerald' : s.status === 'stopped' ? 'slate' : 'sky'}>{s.status}</Badge></Td>
                <Td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(s.started_at)}</Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

function StatRow({ icon: Icon, label, value, tone }: { icon: ComponentType<{ className?: string }>; label: string; value: string; tone: 'sky' | 'rose' | 'amber' | 'violet' }) {
  const colors = { sky: 'text-sky-400 bg-sky-500/10', rose: 'text-rose-400 bg-rose-500/10', amber: 'text-amber-400 bg-amber-500/10', violet: 'text-violet-400 bg-violet-500/10' };
  return (
    <div className="flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colors[tone])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-100 tabular-nums">{value}</p>
      </div>
    </div>
  );
}
