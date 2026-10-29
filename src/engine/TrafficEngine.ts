import type { LiveRequest, LiveTrafficSample, Settings, MitigationRule } from '../types';
import { COUNTRIES, DEMO_PATHS } from '../lib/constants';
import { clamp, pick, randInt, randomIp, uid } from '../lib/utils';
import type {
  AttackRecord,
  AlertRecord,
  BlockedIpRecord,
  DetectionFinding,
  EngineSnapshot,
  LogRecord,
  MitigationAction,
} from './types';

const METHODS = ['GET', 'GET', 'GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'python-requests/2.31.0',
  'curl/8.4.0',
  'Go-http-client/1.1',
  'Bot/1.0 (attack-simulator)',
  'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
];

interface IpState {
  ip: string;
  country: string;
  count: number;
  blocked: boolean;
  blockedUntil: number | null;
  flagged: boolean;
  firstSeen: number;
  lastSeen: number;
  requestsInWindow: number[];
  paths: Map<string, number>;
  methods: Map<string, number>;
  userAgents: Set<string>;
  statusCodes: Map<number, number>;
  totalBytes: number;
  isBot: boolean;
}

export class TrafficEngine {
  private ips = new Map<string, IpState>();
  private recentRequests: LiveRequest[] = [];
  private samples: LiveTrafficSample[] = [];
  private blockedIps = new Map<string, { ip: string; reason: string; action: string; severity: 'low' | 'medium' | 'high' | 'critical'; country: string | null; attackType: string | null; count: number; expiresAt: number | null; createdAt: number }>();
  private whitelist = new Set<string>();
  private rules: MitigationRule[] = [];
  private settings: Settings | null = null;
  private attackMode = false;
  private attackType: string | null = null;
  private attackIntensity = 1;
  private attackIps: string[] = [];
  private attackTarget = '/demo';
  private attackEndsAt = 0;
  private totalRequests = 0;
  private totalBlocked = 0;
  private totalAllowed = 0;
  private connectionCount = 0;
  private lastTick = Date.now();
  private interval: ReturnType<typeof setInterval> | null = null;
  private cb: {
    onSample: (s: LiveTrafficSample, snap: EngineSnapshot) => void;
    onDetection: (f: DetectionFinding[]) => void;
    onMitigation: (a: MitigationAction[]) => void;
    onAttack: (a: AttackRecord) => void;
    onBlockedIp: (b: BlockedIpRecord) => void;
    onAlert: (a: AlertRecord) => void;
    onLog: (l: LogRecord) => void;
  };

  constructor(callbacks: TrafficEngine['cb']) {
    this.cb = callbacks;
  }

  setRules(rules: MitigationRule[]) {
    this.rules = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
  }

  setSettings(s: Settings) {
    this.settings = s;
    this.whitelist = new Set(s.whitelist_ips ?? []);
  }

  setWhitelist(ips: string[]) {
    this.whitelist = new Set(ips);
  }

  startAttack(type: string, intensity: number, target: string, durationMs: number, randomIps: boolean) {
    this.attackMode = true;
    this.attackType = type;
    this.attackIntensity = clamp(intensity, 0.5, 10);
    this.attackTarget = target || '/demo';
    this.attackEndsAt = Date.now() + durationMs;
    const ipCount = Math.max(1, Math.floor(8 * this.attackIntensity));
    this.attackIps = [];
    for (let i = 0; i < ipCount; i++) {
      const ip = randomIps ? randomIp() : `203.0.113.${randInt(2, 250)}`;
      this.attackIps.push(ip);
    }
    this.cb.onAlert({
      level: 'critical',
      category: 'attack',
      title: 'Attack Detected',
      message: `${type.toUpperCase()} flood detected from ${this.attackIps.length} source IPs targeting ${this.attackTarget}`,
      source_ip: this.attackIps[0] ?? null,
    });
    this.cb.onLog({
      actor: 'detection_engine',
      action: 'attack_detected',
      target: this.attackTarget,
      details: `type=${type} intensity=${this.attackIntensity} sources=${this.attackIps.length}`,
      ip_address: this.attackIps[0] ?? null,
    });
  }

  stopAttack() {
    if (this.attackMode) {
      this.attackMode = false;
      this.attackType = null;
      this.attackIps = [];
      this.cb.onAlert({
        level: 'success',
        category: 'attack',
        title: 'Attack Ended',
        message: 'Attack simulation has ended. Mitigation rules returning to baseline.',
        source_ip: null,
      });
    }
  }

  isAttackActive() {
    return this.attackMode;
  }

  start() {
    if (this.interval) return;
    this.lastTick = Date.now();
    this.interval = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private getOrCreateIp(ip: string): IpState {
    let s = this.ips.get(ip);
    if (!s) {
      s = {
        ip,
        country: pick(COUNTRIES).code,
        count: 0,
        blocked: false,
        blockedUntil: null,
        flagged: false,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        requestsInWindow: [],
        paths: new Map(),
        methods: new Map(),
        userAgents: new Set(),
        statusCodes: new Map(),
        totalBytes: 0,
        isBot: false,
      };
      this.ips.set(ip, s);
    }
    return s;
  }

  private tick() {
    const now = Date.now();
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;

    // Expire blocks
    for (const [ip, b] of this.blockedIps) {
      if (b.expiresAt && b.expiresAt < now) {
        this.blockedIps.delete(ip);
        const st = this.ips.get(ip);
        if (st) {
          st.blocked = false;
          st.blockedUntil = null;
        }
      }
    }

    // Expire attack
    if (this.attackMode && now > this.attackEndsAt) {
      this.stopAttack();
    }

    // Generate requests
    let baseRps = 8 + Math.floor(Math.random() * 12);
    let reqCount = Math.floor(baseRps * dt);
    let attackReqCount = 0;
    if (this.attackMode) {
      attackReqCount = Math.floor((40 + 80 * this.attackIntensity) * dt);
      reqCount += attackReqCount;
    }
    reqCount = clamp(reqCount, 0, 500);

    const newRequests: LiveRequest[] = [];
    const findings: DetectionFinding[] = [];
    const mitigations: MitigationAction[] = [];

    for (let i = 0; i < reqCount; i++) {
      const isAttackReq = this.attackMode && i < attackReqCount;
      const ip = isAttackReq
        ? pick(this.attackIps.length ? this.attackIps : [randomIp()])
        : randomIp();
      const state = this.getOrCreateIp(ip);

      // Whitelist bypass
      if (this.whitelist.has(ip)) {
        state.blocked = false;
        state.flagged = false;
      }

      const path = isAttackReq
        ? this.attackTarget
        : pick(DEMO_PATHS);
      const method = isAttackReq
        ? this.attackType === 'post_flood' ? 'POST' : this.attackType === 'get_flood' ? 'GET' : pick(METHODS)
        : pick(METHODS);
      const ua = isAttackReq
        ? pick(['python-requests/2.31.0', 'curl/8.4.0', 'Bot/1.0 (attack-simulator)', 'Go-http-client/1.1'])
        : pick(USER_AGENTS);
      const size = isAttackReq ? randInt(200, 65000) : randInt(200, 5000);
      const latency = isAttackReq ? randInt(5, 50) : randInt(20, 400);

      state.count++;
      state.lastSeen = now;
      state.totalBytes += size;
      state.paths.set(path, (state.paths.get(path) ?? 0) + 1);
      state.methods.set(method, (state.methods.get(method) ?? 0) + 1);
      state.userAgents.add(ua);
      if (ua.toLowerCase().includes('bot') || ua.includes('python') || ua.includes('curl') || ua.includes('go-http')) {
        state.isBot = true;
      }

      // Sliding window (last 10s)
      state.requestsInWindow.push(now);
      while (state.requestsInWindow.length && state.requestsInWindow[0] < now - 10000) {
        state.requestsInWindow.shift();
      }

      // Detection
      let blocked = false;
      let flagged = false;
      let status = 200;

      if (state.blocked && (!state.blockedUntil || state.blockedUntil > now)) {
        blocked = true;
        status = 403;
        this.totalBlocked++;
      } else if (this.whitelist.has(ip)) {
        status = 200;
        this.totalAllowed++;
      } else {
        const rps = state.requestsInWindow.length / 10;
        const finding = this.detect(state, rps, isAttackReq, now);
        if (finding) {
          findings.push(finding);
          state.flagged = true;
          flagged = true;
          const action = this.applyMitigation(state, finding, now);
          if (action) {
            mitigations.push(action);
            if (action.action === 'block' || action.action === 'temp_ban' || action.action === 'perm_ban' || action.action === 'geo_block' || action.action === 'drop') {
              blocked = true;
              status = 403;
              this.totalBlocked++;
            } else if (action.action === 'rate_limit') {
              blocked = Math.random() < 0.6;
              status = blocked ? 429 : 200;
              if (blocked) this.totalBlocked++;
              else this.totalAllowed++;
            } else if (action.action === 'challenge') {
              status = 503;
              blocked = Math.random() < 0.3;
              if (blocked) this.totalBlocked++;
              else this.totalAllowed++;
            } else {
              this.totalAllowed++;
            }
          } else {
            this.totalAllowed++;
            status = 200;
          }
        } else {
          this.totalAllowed++;
          status = 200;
        }
      }

      state.statusCodes.set(status, (state.statusCodes.get(status) ?? 0) + 1);

      const req: LiveRequest = {
        id: uid(),
        ip,
        country: state.country,
        path,
        method,
        status,
        size,
        latencyMs: latency,
        blocked,
        flagged,
        ts: now,
        userAgent: ua,
      };
      newRequests.push(req);
      this.totalRequests++;
      this.connectionCount = Math.min(this.ips.size, 10000);
    }

    // Keep recent requests (last 200)
    this.recentRequests = [...newRequests, ...this.recentRequests].slice(0, 200);

    // Emit findings/mitigations
    if (findings.length) {
      this.cb.onDetection(findings);
      // Create attack record for highest severity finding
      const top = findings.reduce((a, b) => (b.severity > a.severity ? b : a));
      if (this.attackMode || top.severity === 'critical' || top.severity === 'high') {
        const attack: AttackRecord = {
          id: uid(),
          type: (this.attackType as AttackRecord['type']) || 'unknown',
          severity: top.severity,
          source_ip: top.ip,
          source_country: this.ips.get(top.ip)?.country ?? null,
          target: this.attackTarget,
          packets_per_sec: Math.round((reqCount * 1.2) / dt),
          requests_per_sec: Math.round(reqCount / dt),
          bandwidth_mbps: +((newRequests.reduce((a, r) => a + r.size, 0) * 8) / 1_000_000).toFixed(2),
          status: 'active',
          detected_by: top.ruleType,
          detected_at: new Date(now).toISOString(),
        };
        this.cb.onAttack(attack);
      }
    }
    if (mitigations.length) {
      this.cb.onMitigation(mitigations);
      for (const m of mitigations) {
        if (m.action === 'block' || m.action === 'temp_ban' || m.action === 'perm_ban' || m.action === 'geo_block') {
          const st = this.ips.get(m.ip);
          const rec: BlockedIpRecord = {
            ip_address: m.ip,
            reason: m.reason,
            action: m.action,
            severity: findings.find((f) => f.ip === m.ip)?.severity ?? 'medium',
            country: st?.country ?? null,
            attack_type: this.attackType,
            request_count: st?.count ?? 0,
            status: 'active',
            expires_at: m.expiresAt ? new Date(m.expiresAt).toISOString() : null,
          };
          this.cb.onBlockedIp(rec);
        }
      }
    }

    // Build sample
    const rps = Math.round(reqCount / dt);
    const pps = Math.round(rps * 1.2);
    const bw = +((newRequests.reduce((a, r) => a + r.size, 0) * 8) / 1_000_000).toFixed(2);
    const uniqueIps = new Set(newRequests.map((r) => r.ip)).size;
    const blockedCount = newRequests.filter((r) => r.blocked).length;
    const cpu = clamp(20 + rps * 0.3 + (this.attackMode ? 25 * this.attackIntensity : 0), 5, 99);
    const ram = clamp(35 + this.ips.size * 0.02 + (this.attackMode ? 15 * this.attackIntensity : 0), 10, 99);
    const sample: LiveTrafficSample = {
      t: now,
      requestsPerSec: rps,
      packetsPerSec: pps,
      bandwidthMbps: bw,
      uniqueIps,
      blocked: blockedCount,
      isAttack: this.attackMode,
      cpu: +cpu.toFixed(1),
      ram: +ram.toFixed(1),
    };
    this.samples = [...this.samples, sample].slice(-120);

    // Snapshot
    const topIps = [...this.ips.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((s) => ({ ip: s.ip, count: s.count, country: s.country, blocked: s.blocked }));
    const pathMap = new Map<string, number>();
    for (const r of newRequests) pathMap.set(r.path, (pathMap.get(r.path) ?? 0) + 1);
    const topPaths = [...pathMap.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 8);
    const countryMap = new Map<string, number>();
    for (const r of newRequests) countryMap.set(r.country, (countryMap.get(r.country) ?? 0) + 1);
    const countryDist = [...countryMap.entries()].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
    const statusMap = new Map<number, number>();
    for (const r of newRequests) statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
    const statusDist = [...statusMap.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => a.status - b.status);

    const snapshot: EngineSnapshot = {
      sample,
      topIps,
      topPaths,
      countryDist,
      statusDist,
      recentRequests: this.recentRequests.slice(0, 50),
      activeAttacks: this.attackMode ? 1 : 0,
      blockedTotal: this.totalBlocked,
      allowedTotal: this.totalAllowed,
      connectionCount: this.connectionCount,
      threatScore: this.computeThreatScore(),
    };

    this.cb.onSample(sample, snapshot);
  }

  private computeThreatScore(): number {
    let score = 10;
    if (this.attackMode) score += 40 + 15 * this.attackIntensity;
    score += Math.min(30, this.blockedIps.size * 2);
    const flagged = [...this.ips.values()].filter((i) => i.flagged).length;
    score += Math.min(20, flagged);
    return clamp(Math.round(score), 0, 100);
  }

  private detect(state: IpState, rps: number, isAttack: boolean, now: number): DetectionFinding | null {
    const sens = this.settings?.detection_sensitivity ?? 'medium';
    const sensMult = { low: 1.6, medium: 1.2, high: 1.0, max: 0.8 }[sens] ?? 1.2;

    for (const rule of this.rules) {
      const threshold = Math.max(1, Math.round(rule.threshold * sensMult));
      switch (rule.type) {
        case 'threshold': {
          if (state.count > threshold) {
            return this.finding(rule, state, 'high', `IP exceeded request threshold (${state.count} > ${threshold})`, { value: state.count, threshold });
          }
          break;
        }
        case 'rate': {
          if (rps > threshold / 10) {
            return this.finding(rule, state, rps > threshold / 5 ? 'critical' : 'high', `High request rate ${rps.toFixed(1)} req/s (threshold ${(threshold / 10).toFixed(1)})`, { value: +rps.toFixed(1), threshold: +(threshold / 10).toFixed(1) });
          }
          break;
        }
        case 'spike': {
          const baseline = 5;
          if (rps > baseline * threshold * 0.1) {
            return this.finding(rule, state, 'high', `Traffic spike: ${rps.toFixed(1)} req/s vs baseline ${baseline}`, { value: +rps.toFixed(1), threshold: baseline });
          }
          break;
        }
        case 'signature': {
          if (state.userAgents.size === 1 && [...state.userAgents][0]?.toLowerCase().includes('bot')) {
            return this.finding(rule, state, 'medium', `Bot signature matched: ${[...state.userAgents][0]}`, { value: 1, threshold: 1 });
          }
          break;
        }
        case 'behavior': {
          if (state.paths.size === 1 && state.count > 15) {
            return this.finding(rule, state, 'medium', `Repetitive single-path behavior (${state.count}x ${[...state.paths.keys()][0]})`, { value: state.count, threshold: 15 });
          }
          break;
        }
        case 'entropy': {
          if (state.userAgents.size === 1 && state.count > 20) {
            return this.finding(rule, state, 'medium', `Low entropy: identical user-agent across ${state.count} requests`, { value: state.count, threshold: 20 });
          }
          break;
        }
        case 'protocol': {
          if (state.methods.size === 1 && [...state.methods.keys()][0] === 'POST' && state.count > 10) {
            return this.finding(rule, state, 'medium', `Protocol anomaly: excessive POST requests (${state.count})`, { value: state.count, threshold: 10 });
          }
          break;
        }
        case 'adaptive': {
          const avg = state.count / Math.max(1, (now - state.firstSeen) / 1000);
          if (avg > threshold / 10 && state.count > 20) {
            return this.finding(rule, state, 'high', `Adaptive threshold breached (avg ${avg.toFixed(1)} req/s)`, { value: +avg.toFixed(1), threshold: +(threshold / 10).toFixed(1) });
          }
          break;
        }
        case 'geo': {
          if (this.settings?.geo_block_enabled && this.settings.geo_blocked_countries.includes(state.country)) {
            return this.finding(rule, state, 'high', `Geo-blocked country: ${state.country}`, { value: 1, threshold: 1 });
          }
          break;
        }
        case 'header': {
          if (state.userAgents.size === 1 && [...state.userAgents][0]?.length < 20) {
            return this.finding(rule, state, 'low', `Suspicious/minimal user-agent header`, { value: 1, threshold: 1 });
          }
          break;
        }
        case 'bot': {
          if (state.isBot && state.count > 8) {
            return this.finding(rule, state, 'high', `Bot pattern detected (${state.count} automated requests)`, { value: state.count, threshold: 8 });
          }
          break;
        }
      }
    }
    // Fallback: if attack mode and no rule matched but high rate, flag generically
    if (isAttack && rps > 5 && !state.flagged) {
      return {
        id: uid(),
        ruleType: 'rate',
        ruleName: 'builtin:rate',
        ip: state.ip,
        severity: rps > 15 ? 'critical' : 'high',
        message: `Anomalous rate ${rps.toFixed(1)} req/s from ${state.ip}`,
        metric: { value: +rps.toFixed(1), threshold: 5 },
        ts: now,
      };
    }
    return null;
  }

  private finding(rule: MitigationRule, state: IpState, severity: DetectionFinding['severity'], message: string, metric: { value: number; threshold: number }): DetectionFinding {
    return {
      id: uid(),
      ruleType: rule.type,
      ruleName: rule.name,
      ip: state.ip,
      severity,
      message,
      metric,
      ts: Date.now(),
    };
  }

  private applyMitigation(state: IpState, finding: DetectionFinding, now: number): MitigationAction | null {
    if (!this.settings?.auto_mitigation) return null;
    // Find matching rule action
    const rule = this.rules.find((r) => r.type === finding.ruleType);
    const action = rule?.action ?? 'rate_limit';
    const duration = (this.settings.block_duration_minutes ?? 30) * 60 * 1000;
    let expiresAt: number | null = null;
    if (action === 'temp_ban') expiresAt = now + duration;
    if (action === 'block') expiresAt = now + Math.min(duration, 10 * 60 * 1000);

    if (action === 'block' || action === 'temp_ban' || action === 'perm_ban' || action === 'geo_block' || action === 'drop') {
      state.blocked = true;
      state.blockedUntil = expiresAt;
      this.blockedIps.set(state.ip, {
        ip: state.ip,
        reason: finding.message,
        action,
        severity: finding.severity,
        country: state.country,
        attackType: this.attackType,
        count: state.count,
        expiresAt,
        createdAt: now,
      });
    }

    return {
      id: uid(),
      ip: state.ip,
      action,
      reason: finding.message,
      ruleName: finding.ruleName,
      ts: now,
      expiresAt,
    };
  }

  getBlockedIps() {
    return [...this.blockedIps.values()];
  }

  getStats() {
    return {
      totalRequests: this.totalRequests,
      totalBlocked: this.totalBlocked,
      totalAllowed: this.totalAllowed,
      uniqueIps: this.ips.size,
      blockedIps: this.blockedIps.size,
    };
  }

  reset() {
    this.ips.clear();
    this.recentRequests = [];
    this.samples = [];
    this.blockedIps.clear();
    this.totalRequests = 0;
    this.totalBlocked = 0;
    this.totalAllowed = 0;
    this.connectionCount = 0;
    this.attackMode = false;
  }
}
