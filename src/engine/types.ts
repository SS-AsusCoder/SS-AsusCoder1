import type { AttackType, LiveRequest, LiveTrafficSample, MitigationRule } from '../types';

export interface EngineSnapshot {
  sample: LiveTrafficSample;
  topIps: { ip: string; count: number; country: string; blocked: boolean }[];
  topPaths: { path: string; count: number }[];
  countryDist: { country: string; count: number }[];
  statusDist: { status: number; count: number }[];
  recentRequests: LiveRequest[];
  activeAttacks: number;
  blockedTotal: number;
  allowedTotal: number;
  connectionCount: number;
  threatScore: number;
}

export interface EngineCallbacks {
  onSample: (sample: LiveTrafficSample, snapshot: EngineSnapshot) => void;
  onDetection: (findings: DetectionFinding[]) => void;
  onMitigation: (actions: MitigationAction[]) => void;
  onAttack: (attack: AttackRecord) => void;
  onBlockedIp: (ip: BlockedIpRecord) => void;
  onAlert: (alert: AlertRecord) => void;
  onLog: (log: LogRecord) => void;
}

export interface DetectionFinding {
  id: string;
  ruleType: MitigationRule['type'];
  ruleName: string;
  ip: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: { value: number; threshold: number };
  ts: number;
}

export interface MitigationAction {
  id: string;
  ip: string;
  action: string;
  reason: string;
  ruleName: string;
  ts: number;
  expiresAt: number | null;
}

export interface AttackRecord {
  id: string;
  type: AttackType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source_ip: string;
  source_country: string | null;
  target: string;
  packets_per_sec: number;
  requests_per_sec: number;
  bandwidth_mbps: number;
  status: 'active' | 'mitigated';
  detected_by: string;
  detected_at: string;
}

export interface BlockedIpRecord {
  ip_address: string;
  reason: string;
  action: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  country: string | null;
  attack_type: string | null;
  request_count: number;
  status: 'active' | 'expired' | 'whitelisted' | 'released';
  expires_at: string | null;
}

export interface AlertRecord {
  level: 'info' | 'warning' | 'critical' | 'success';
  category: string;
  title: string;
  message: string;
  source_ip: string | null;
}

export interface LogRecord {
  actor: string;
  action: string;
  target: string | null;
  details: string | null;
  ip_address: string | null;
}

export interface SimCommand {
  type: 'start' | 'pause' | 'resume' | 'stop';
  config?: {
    attackType: AttackType;
    target: string;
    concurrency: number;
    durationSeconds: number;
    requestsPerSecond: number;
    randomIps: boolean;
    name: string;
  };
}
