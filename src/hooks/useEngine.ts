import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TrafficEngine } from '../engine/TrafficEngine';
import type { Attack, Alert, BlockedIp, LiveTrafficSample, MitigationRule, Settings, Simulation } from '../types';
import type { EngineSnapshot, DetectionFinding, MitigationAction, AttackRecord, BlockedIpRecord, AlertRecord, LogRecord } from '../engine/types';

interface EngineState {
  sample: LiveTrafficSample | null;
  snapshot: EngineSnapshot | null;
  samples: LiveTrafficSample[];
  attacks: Attack[];
  alerts: Alert[];
  blockedIps: BlockedIp[];
  rules: MitigationRule[];
  settings: Settings | null;
  simulations: Simulation[];
  attackActive: boolean;
  attackType: string | null;
  pendingFindings: DetectionFinding[];
  pendingMitigations: MitigationAction[];
}

export function useEngine() {
  const { session, settings, refreshSettings } = useAuth();
  const engineRef = useRef<TrafficEngine | null>(null);
  const [state, setState] = useState<EngineState>({
    sample: null,
    snapshot: null,
    samples: [],
    attacks: [],
    alerts: [],
    blockedIps: [],
    rules: [],
    settings: null,
    simulations: [],
    attackActive: false,
    attackType: null,
    pendingFindings: [],
    pendingMitigations: [],
  });

  // Load rules
  const loadRules = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase.from('mitigation_rules').select('*').eq('user_id', session.user.id).order('priority', { ascending: true });
    if (data && data.length === 0) {
      // seed default rules
      const defaults = [
        { name: 'High Request Rate', description: 'Block IPs exceeding 100 req/s', type: 'rate' as const, action: 'rate_limit' as const, threshold: 1000, window_seconds: 10, enabled: true, priority: 10 },
        { name: 'Traffic Spike', description: 'Detect sudden traffic spikes', type: 'spike' as const, action: 'challenge' as const, threshold: 50, window_seconds: 30, enabled: true, priority: 20 },
        { name: 'Bot Pattern', description: 'Detect automated bot traffic', type: 'bot' as const, action: 'block' as const, threshold: 8, window_seconds: 60, enabled: true, priority: 30 },
        { name: 'Repetitive Behavior', description: 'Single-path repeated requests', type: 'behavior' as const, action: 'rate_limit' as const, threshold: 15, window_seconds: 60, enabled: true, priority: 40 },
        { name: 'Low Entropy', description: 'Identical user-agent flooding', type: 'entropy' as const, action: 'temp_ban' as const, threshold: 20, window_seconds: 60, enabled: true, priority: 50 },
        { name: 'Protocol Anomaly', description: 'Excessive POST requests', type: 'protocol' as const, action: 'rate_limit' as const, threshold: 10, window_seconds: 30, enabled: true, priority: 60 },
        { name: 'Adaptive Threshold', description: 'Dynamic baseline detection', type: 'adaptive' as const, action: 'temp_ban' as const, threshold: 200, window_seconds: 60, enabled: true, priority: 70 },
        { name: 'Suspicious Header', description: 'Minimal user-agent detection', type: 'header' as const, action: 'challenge' as const, threshold: 1, window_seconds: 30, enabled: false, priority: 80 },
      ];
      const rows = defaults.map((d) => ({ ...d, user_id: session.user.id }));
      const { data: inserted } = await supabase.from('mitigation_rules').insert(rows).select();
      if (inserted) {
        setState((s) => ({ ...s, rules: inserted as MitigationRule[] }));
        engineRef.current?.setRules(inserted as MitigationRule[]);
      }
    } else if (data) {
      setState((s) => ({ ...s, rules: data as MitigationRule[] }));
      engineRef.current?.setRules(data as MitigationRule[]);
    }
  }, [session?.user]);

  // Load initial data
  const loadInitial = useCallback(async () => {
    if (!session?.user) return;
    const [attacks, alerts, blocked, sims] = await Promise.all([
      supabase.from('attacks').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('alerts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('blocked_ips').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('simulations').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20),
    ]);
    setState((s) => ({
      ...s,
      attacks: (attacks.data as Attack[]) ?? [],
      alerts: (alerts.data as Alert[]) ?? [],
      blockedIps: (blocked.data as BlockedIp[]) ?? [],
      simulations: (sims.data as Simulation[]) ?? [],
    }));
  }, [session?.user]);

  // Persist helpers (debounced via batch)
  const pendingAttacks = useRef<AttackRecord[]>([]);
  const pendingBlocked = useRef<BlockedIpRecord[]>([]);
  const pendingAlerts = useRef<AlertRecord[]>([]);
  const pendingLogs = useRef<LogRecord[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(async () => {
      flushTimer.current = null;
      if (!session?.user) return;
      const attacks = pendingAttacks.current.splice(0);
      const blocked = pendingBlocked.current.splice(0);
      const alerts = pendingAlerts.current.splice(0);
      const logs = pendingLogs.current.splice(0);
      if (attacks.length) {
        await supabase.from('attacks').insert(attacks.map((a) => ({ ...a, user_id: session.user.id })));
        setState((s) => ({ ...s, attacks: [...attacks.map((a) => ({ ...a, user_id: session.user.id, mitigated_at: null, created_at: a.detected_at } as Attack)), ...s.attacks].slice(0, 100) }));
      }
      if (blocked.length) {
        for (const b of blocked) {
          const { error } = await supabase.from('blocked_ips').upsert({ ...b, user_id: session.user.id }, { onConflict: 'user_id,ip_address' });
          if (error) {
            // eslint-disable-next-line no-console
            console.error('blocked upsert error', error);
          }
        }
        const { data } = await supabase.from('blocked_ips').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(100);
        if (data) setState((s) => ({ ...s, blockedIps: data as BlockedIp[] }));
      }
      if (alerts.length) {
        await supabase.from('alerts').insert(alerts.map((a) => ({ ...a, user_id: session.user.id })));
        const { data } = await supabase.from('alerts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50);
        if (data) setState((s) => ({ ...s, alerts: data as Alert[] }));
      }
      if (logs.length) {
        await supabase.from('audit_logs').insert(logs.map((l) => ({ ...l, user_id: session.user.id })));
      }
    }, 1500);
  }, [session?.user]);

  // Init engine
  useEffect(() => {
    if (!session?.user) return;
    const engine = new TrafficEngine({
      onSample: (sample, snapshot) => {
        setState((s) => ({ ...s, sample, snapshot, samples: [...s.samples, sample].slice(-120) }));
      },
      onDetection: (findings) => {
        setState((s) => ({ ...s, pendingFindings: [...findings, ...s.pendingFindings].slice(0, 50) }));
      },
      onMitigation: (mitigations) => {
        setState((s) => ({ ...s, pendingMitigations: [...mitigations, ...s.pendingMitigations].slice(0, 50) }));
        for (const m of mitigations) {
          pendingLogs.current.push({
            actor: 'mitigation_engine',
            action: m.action,
            target: m.ip,
            details: m.reason,
            ip_address: m.ip,
          });
        }
        scheduleFlush();
      },
      onAttack: (attack) => {
        pendingAttacks.current.push(attack);
        scheduleFlush();
      },
      onBlockedIp: (ip) => {
        pendingBlocked.current.push(ip);
        scheduleFlush();
      },
      onAlert: (alert) => {
        pendingAlerts.current.push(alert);
        scheduleFlush();
      },
      onLog: (log) => {
        pendingLogs.current.push(log);
        scheduleFlush();
      },
    });
    engineRef.current = engine;
    engine.start();
    loadInitial();
    loadRules();
    if (settings) engine.setSettings(settings);

    return () => {
      engine.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  useEffect(() => {
    if (settings && engineRef.current) {
      engineRef.current.setSettings(settings);
      engineRef.current.setWhitelist(settings.whitelist_ips ?? []);
      setState((s) => ({ ...s, settings }));
    }
  }, [settings]);

  const startAttack = useCallback((type: string, intensity: number, target: string, durationMs: number, randomIps: boolean) => {
    engineRef.current?.startAttack(type, intensity, target, durationMs, randomIps);
    setState((s) => ({ ...s, attackActive: true, attackType: type }));
  }, []);

  const stopAttack = useCallback(() => {
    engineRef.current?.stopAttack();
    setState((s) => ({ ...s, attackActive: false, attackType: null }));
  }, []);

  const saveSimulation = useCallback(async (sim: Partial<Simulation>) => {
    if (!session?.user) return null;
    const { data } = await supabase.from('simulations').insert({ ...sim, user_id: session.user.id } as never).select().maybeSingle();
    if (data) {
      setState((s) => ({ ...s, simulations: [data as Simulation, ...s.simulations].slice(0, 20) }));
    }
    return data as Simulation | null;
  }, [session?.user]);

  const updateSimulation = useCallback(async (id: string, patch: Partial<Simulation>) => {
    await supabase.from('simulations').update(patch).eq('id', id);
    setState((s) => ({ ...s, simulations: s.simulations.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }, []);

  const acknowledgeAlert = useCallback(async (id: string) => {
    await supabase.from('alerts').update({ acknowledged: true }).eq('id', id);
    setState((s) => ({ ...s, alerts: s.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)) }));
  }, []);

  const clearFindings = useCallback(() => setState((s) => ({ ...s, pendingFindings: [], pendingMitigations: [] })), []);

  const releaseBlockedIp = useCallback(async (ip: string) => {
    if (!session?.user) return;
    await supabase.from('blocked_ips').update({ status: 'released' }).eq('user_id', session.user.id).eq('ip_address', ip);
    setState((s) => ({ ...s, blockedIps: s.blockedIps.map((b) => (b.ip_address === ip ? { ...b, status: 'released' } : b)) }));
    pendingLogs.current.push({ actor: 'user', action: 'release_ip', target: ip, details: 'Manually released IP block', ip_address: null });
    scheduleFlush();
  }, [session?.user, scheduleFlush]);

  const whitelistIp = useCallback(async (ip: string) => {
    if (!session?.user || !settings) return;
    const newList = [...new Set([...(settings.whitelist_ips ?? []), ip])];
    const { error } = await supabase.from('settings').update({ whitelist_ips: newList }).eq('user_id', session.user.id);
    if (!error) {
      await refreshSettings();
      setState((s) => ({ ...s, blockedIps: s.blockedIps.map((b) => (b.ip_address === ip ? { ...b, status: 'whitelisted' } : b)) }));
    }
  }, [session?.user, settings, refreshSettings]);

  const blockIpManual = useCallback(async (ip: string, action: string, severity: string, reason: string) => {
    if (!session?.user) return;
    const { error } = await supabase.from('blocked_ips').upsert({
      user_id: session.user.id,
      ip_address: ip,
      reason,
      action,
      severity,
      status: 'active',
      request_count: 0,
    } as never, { onConflict: 'user_id,ip_address' });
    if (!error) {
      const { data } = await supabase.from('blocked_ips').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(100);
      if (data) setState((s) => ({ ...s, blockedIps: data as BlockedIp[] }));
      pendingLogs.current.push({ actor: 'user', action: 'manual_block', target: ip, details: reason, ip_address: null });
      scheduleFlush();
    }
  }, [session?.user, scheduleFlush]);

  const saveRule = useCallback(async (rule: Partial<MitigationRule>) => {
    if (!session?.user) return;
    if (rule.id) {
      const { data } = await supabase.from('mitigation_rules').update(rule).eq('id', rule.id).select().maybeSingle();
      if (data) {
        setState((s) => ({ ...s, rules: s.rules.map((r) => (r.id === rule.id ? (data as MitigationRule) : r)) }));
        engineRef.current?.setRules(state.rules.map((r) => (r.id === rule.id ? (data as MitigationRule) : r)));
      }
    } else {
      const { data } = await supabase.from('mitigation_rules').insert({ ...rule, user_id: session.user.id }).select().maybeSingle();
      if (data) {
        setState((s) => ({ ...s, rules: [...s.rules, data as MitigationRule].sort((a, b) => a.priority - b.priority) }));
        engineRef.current?.setRules([...state.rules, data as MitigationRule].sort((a, b) => a.priority - b.priority));
      }
    }
  }, [session?.user, state.rules]);

  const deleteRule = useCallback(async (id: string) => {
    await supabase.from('mitigation_rules').delete().eq('id', id);
    setState((s) => {
      const next = s.rules.filter((r) => r.id !== id);
      engineRef.current?.setRules(next);
      return { ...s, rules: next };
    });
  }, []);

  const toggleRule = useCallback(async (id: string, enabled: boolean) => {
    await supabase.from('mitigation_rules').update({ enabled }).eq('id', id);
    setState((s) => {
      const next = s.rules.map((r) => (r.id === id ? { ...r, enabled } : r));
      engineRef.current?.setRules(next);
      return { ...s, rules: next };
    });
  }, []);

  return {
    ...state,
    startAttack,
    stopAttack,
    saveSimulation,
    updateSimulation,
    acknowledgeAlert,
    clearFindings,
    releaseBlockedIp,
    whitelistIp,
    blockIpManual,
    saveRule,
    deleteRule,
    toggleRule,
    loadRules,
    loadInitial,
  };
}
