import { useState } from 'react';
import { Settings as SettingsIcon, Shield, Bell, Globe, Lock, Save, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Input';
import { cn } from '../lib/utils';
import { COUNTRIES } from '../lib/constants';
import type { Sensitivity } from '../types';

export function SettingsPage() {
  const { settings, updateSettings } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newCountry, setNewCountry] = useState('');

  // Sync form when settings load
  if (settings && form === null) setForm(settings);
  if (!settings) return <p className="text-sm text-slate-500">Loading settings...</p>;
  const f = form ?? settings;

  const save = async () => {
    setSaving(true);
    const { error } = await updateSettings({
      detection_sensitivity: f.detection_sensitivity,
      auto_mitigation: f.auto_mitigation,
      email_alerts: f.email_alerts,
      browser_notifications: f.browser_notifications,
      rate_limit_rps: f.rate_limit_rps,
      block_duration_minutes: f.block_duration_minutes,
      geo_block_enabled: f.geo_block_enabled,
      geo_blocked_countries: f.geo_blocked_countries,
      whitelist_ips: f.whitelist_ips,
      theme: f.theme,
    });
    setSaving(false);
    if (error) push('error', 'Save failed', error);
    else push('success', 'Settings saved', 'Configuration updated successfully');
  };

  const addWhitelist = () => {
    if (!newIp) return;
    setForm({ ...f, whitelist_ips: [...new Set([...f.whitelist_ips, newIp])] });
    setNewIp('');
  };
  const removeWhitelist = (ip: string) => setForm({ ...f, whitelist_ips: f.whitelist_ips.filter((x) => x !== ip) });

  const addCountry = () => {
    if (!newCountry) return;
    setForm({ ...f, geo_blocked_countries: [...new Set([...f.geo_blocked_countries, newCountry])] });
    setNewCountry('');
  };
  const removeCountry = (c: string) => setForm({ ...f, geo_blocked_countries: f.geo_blocked_countries.filter((x) => x !== c) });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Detection Configuration" subtitle="Tune the detection engine sensitivity" icon={Shield} />
        <CardBody className="space-y-4">
          <Field label="Detection Sensitivity" hint="Lower = fewer false positives, Higher = more aggressive detection">
            <Select value={f.detection_sensitivity} onChange={(e) => setForm({ ...f, detection_sensitivity: e.target.value as Sensitivity })}>
              <option value="low">Low (Conservative)</option><option value="medium">Medium (Balanced)</option><option value="high">High (Aggressive)</option><option value="max">Max (Paranoid)</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate Limit (req/s)"><Input type="number" value={f.rate_limit_rps} onChange={(e) => setForm({ ...f, rate_limit_rps: +e.target.value })} /></Field>
            <Field label="Block Duration (minutes)"><Input type="number" value={f.block_duration_minutes} onChange={(e) => setForm({ ...f, block_duration_minutes: +e.target.value })} /></Field>
          </div>
          <Toggle label="Auto Mitigation" desc="Automatically apply mitigation actions when attacks detected" checked={f.auto_mitigation} onChange={(v) => setForm({ ...f, auto_mitigation: v })} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notifications" subtitle="Configure alert delivery" icon={Bell} />
        <CardBody className="space-y-3">
          <Toggle label="Email Alerts" desc="Send critical alerts to your email" checked={f.email_alerts} onChange={(v) => setForm({ ...f, email_alerts: v })} />
          <Toggle label="Browser Notifications" desc="Show in-browser push notifications" checked={f.browser_notifications} onChange={(v) => setForm({ ...f, browser_notifications: v })} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Geo Blocking" subtitle="Block traffic from specific countries" icon={Globe} />
        <CardBody className="space-y-4">
          <Toggle label="Enable Geo Blocking" desc="Block requests from listed countries" checked={f.geo_block_enabled} onChange={(v) => setForm({ ...f, geo_block_enabled: v })} />
          <div className="flex gap-2">
            <Select value={newCountry} onChange={(e) => setNewCountry(e.target.value)} className="flex-1">
              <option value="">Select country...</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
            </Select>
            <Button size="md" variant="secondary" onClick={addCountry}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {f.geo_blocked_countries.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300">
                {COUNTRIES.find((x) => x.code === c)?.name ?? c}
                <button onClick={() => removeCountry(c)}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {f.geo_blocked_countries.length === 0 && <p className="text-xs text-slate-500">No countries blocked</p>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="IP Whitelist" subtitle="IPs that bypass all detection rules" icon={Lock} />
        <CardBody className="space-y-4">
          <div className="flex gap-2">
            <Input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="203.0.113.50" className="flex-1" />
            <Button size="md" variant="secondary" onClick={addWhitelist}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {f.whitelist_ips.map((ip) => (
              <span key={ip} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                {ip}
                <button onClick={() => removeWhitelist(ip)}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {f.whitelist_ips.length === 0 && <p className="text-xs text-slate-500">No whitelisted IPs</p>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Appearance" subtitle="Dashboard theme" icon={SettingsIcon} />
        <CardBody>
          <Field label="Theme">
            <Select value={f.theme} onChange={(e) => setForm({ ...f, theme: e.target.value as 'dark' | 'light' | 'cyber' })}>
              <option value="dark">Dark (Default)</option><option value="light">Light</option><option value="cyber">Cyber</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-4">
        <Button size="lg" onClick={save} disabled={saving} className="shadow-xl">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button onClick={() => onChange(!checked)} className={cn('w-12 h-6 rounded-full transition-colors relative shrink-0', checked ? 'bg-sky-500' : 'bg-slate-700')}>
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform', checked ? 'translate-x-6' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}
