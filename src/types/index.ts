export type Role = 'admin' | 'analyst' | 'viewer';
export type UserStatus = 'active' | 'locked' | 'suspended';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type AlertLevel = 'info' | 'warning' | 'critical' | 'success';
export type AttackType =
  | 'http_flood'
  | 'get_flood'
  | 'post_flood'
  | 'syn_flood'
  | 'udp_flood'
  | 'slowloris'
  | 'icmp_flood'
  | 'dns_amp'
  | 'bot'
  | 'burst'
  | 'unknown';
export type AttackStatus = 'active' | 'mitigated' | 'expired' | 'false_positive';
export type MitigationAction =
  | 'block'
  | 'rate_limit'
  | 'challenge'
  | 'temp_ban'
  | 'perm_ban'
  | 'geo_block'
  | 'drop'
  | 'shape';
export type BlockedStatus = 'active' | 'expired' | 'whitelisted' | 'released';
export type RuleType =
  | 'threshold'
  | 'rate'
  | 'signature'
  | 'behavior'
  | 'entropy'
  | 'protocol'
  | 'spike'
  | 'adaptive'
  | 'geo'
  | 'header'
  | 'bot';
export type SimStatus = 'running' | 'paused' | 'completed' | 'stopped' | 'failed';
export type Sensitivity = 'low' | 'medium' | 'high' | 'max';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: Role;
  status: UserStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attack {
  id: string;
  user_id: string;
  type: AttackType;
  severity: Severity;
  source_ip: string;
  source_country: string | null;
  target: string;
  packets_per_sec: number;
  requests_per_sec: number;
  bandwidth_mbps: number;
  status: AttackStatus;
  detected_by: string;
  detected_at: string;
  mitigated_at: string | null;
  created_at: string;
}

export interface BlockedIp {
  id: string;
  user_id: string;
  ip_address: string;
  reason: string;
  action: MitigationAction;
  severity: Severity;
  country: string | null;
  attack_type: string | null;
  request_count: number;
  status: BlockedStatus;
  expires_at: string | null;
  created_at: string;
}

export interface MitigationRule {
  id: string;
  user_id: string;
  name: string;
  description: string;
  type: RuleType;
  action: MitigationAction;
  threshold: number;
  window_seconds: number;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  level: AlertLevel;
  category: string;
  title: string;
  message: string;
  source_ip: string | null;
  attack_id: string | null;
  acknowledged: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  actor: string;
  action: string;
  target: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  detection_sensitivity: Sensitivity;
  auto_mitigation: boolean;
  email_alerts: boolean;
  browser_notifications: boolean;
  rate_limit_rps: number;
  block_duration_minutes: number;
  geo_block_enabled: boolean;
  geo_blocked_countries: string[];
  whitelist_ips: string[];
  theme: 'dark' | 'light' | 'cyber';
  updated_at: string;
}

export interface Simulation {
  id: string;
  user_id: string;
  name: string;
  attack_type: AttackType;
  target: string;
  concurrency: number;
  duration_seconds: number;
  requests_per_second: number;
  random_ips: boolean;
  status: SimStatus;
  total_requests: number;
  blocked_requests: number;
  detected_attacks: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface TrafficMetric {
  id: string;
  user_id: string;
  bucket: string;
  requests_per_sec: number;
  packets_per_sec: number;
  bandwidth_mbps: number;
  unique_ips: number;
  blocked_count: number;
  attack_count: number;
  cpu_usage: number;
  ram_usage: number;
  is_attack: boolean;
  created_at: string;
}

export interface LiveTrafficSample {
  t: number;
  requestsPerSec: number;
  packetsPerSec: number;
  bandwidthMbps: number;
  uniqueIps: number;
  blocked: number;
  isAttack: boolean;
  cpu: number;
  ram: number;
}

export interface LiveRequest {
  id: string;
  ip: string;
  country: string;
  path: string;
  method: string;
  status: number;
  size: number;
  latencyMs: number;
  blocked: boolean;
  flagged: boolean;
  ts: number;
  userAgent: string;
}

export interface DetectionFinding {
  id: string;
  ruleType: RuleType;
  ruleName: string;
  ip: string;
  severity: Severity;
  message: string;
  metric: { value: number; threshold: number };
  ts: number;
}

export interface SimConfig {
  attackType: AttackType;
  target: string;
  concurrency: number;
  durationSeconds: number;
  requestsPerSecond: number;
  randomIps: boolean;
  name: string;
}

export interface SimRunState {
  running: boolean;
  paused: boolean;
  startedAt: number | null;
  endsAt: number | null;
  elapsedSec: number;
  remainingSec: number;
  totalRequests: number;
  blockedRequests: number;
  detectedAttacks: number;
  progress: number;
}
