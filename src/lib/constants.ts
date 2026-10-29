import type { AttackType, MitigationAction, RuleType, Severity } from '../types';

export const ATTACK_TYPES: { value: AttackType; label: string; description: string; icon: string }[] = [
  { value: 'http_flood', label: 'HTTP Flood', description: 'High-volume HTTP requests targeting app layer', icon: 'wave' },
  { value: 'get_flood', label: 'GET Flood', description: 'Burst of GET requests to overwhelm server', icon: 'arrow-down' },
  { value: 'post_flood', label: 'POST Flood', description: 'Heavy POST payloads to exhaust server resources', icon: 'arrow-up' },
  { value: 'syn_flood', label: 'SYN Flood', description: 'TCP SYN packets without completing handshake', icon: 'radio' },
  { value: 'udp_flood', label: 'UDP Flood', description: 'Large UDP packets to random ports', icon: 'globe' },
  { value: 'slowloris', label: 'Slowloris', description: 'Slow incomplete HTTP connections', icon: 'hourglass' },
  { value: 'icmp_flood', label: 'ICMP Flood', description: 'Ping flood overwhelming network layer', icon: 'zap' },
  { value: 'dns_amp', label: 'DNS Amplification', description: 'Spoofed DNS queries for amplified responses', icon: 'server' },
  { value: 'bot', label: 'Bot Traffic', description: 'Distributed botnet-style coordinated requests', icon: 'bot' },
  { value: 'burst', label: 'Burst Requests', description: 'Sudden spike of requests in short window', icon: 'activity' },
];

export const MITIGATION_ACTIONS: { value: MitigationAction; label: string; description: string }[] = [
  { value: 'block', label: 'Block', description: 'Drop all packets from source IP' },
  { value: 'rate_limit', label: 'Rate Limit', description: 'Throttle requests to allowed rate' },
  { value: 'challenge', label: 'Challenge', description: 'Issue JS/CAPTCHA challenge' },
  { value: 'temp_ban', label: 'Temporary Ban', description: 'Block IP for a fixed duration' },
  { value: 'perm_ban', label: 'Permanent Ban', description: 'Block IP indefinitely' },
  { value: 'geo_block', label: 'Geo Block', description: 'Block by country/region' },
  { value: 'drop', label: 'Drop', description: 'Silently drop matching connections' },
  { value: 'shape', label: 'Traffic Shape', description: 'Queue and shape suspicious traffic' },
];

export const RULE_TYPES: { value: RuleType; label: string; description: string }[] = [
  { value: 'threshold', label: 'Threshold', description: 'Trigger when metric exceeds fixed value' },
  { value: 'rate', label: 'Rate-based', description: 'Requests per second per IP' },
  { value: 'signature', label: 'Signature', description: 'Match known attack signatures' },
  { value: 'behavior', label: 'Behavior Analysis', description: 'Deviation from baseline behavior' },
  { value: 'entropy', label: 'Entropy', description: 'Low-entropy / repetitive payload detection' },
  { value: 'protocol', label: 'Protocol Analysis', description: 'Invalid or anomalous protocol flags' },
  { value: 'spike', label: 'Traffic Spike', description: 'Sudden surge over baseline' },
  { value: 'adaptive', label: 'Adaptive Threshold', description: 'Dynamic threshold from rolling baseline' },
  { value: 'geo', label: 'Geo-based', description: 'Block or flag by country' },
  { value: 'header', label: 'Header Inspection', description: 'Suspicious or missing headers' },
  { value: 'bot', label: 'Bot Pattern', description: 'Bot-like request patterns' },
];

export const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];

export const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CN', name: 'China' },
  { code: 'RU', name: 'Russia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'TR', name: 'Turkey' },
  { code: 'IR', name: 'Iran' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'PL', name: 'Poland' },
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'traffic', label: 'Live Traffic', icon: 'Activity' },
  { id: 'attacks', label: 'Attacks', icon: 'ShieldAlert' },
  { id: 'mitigation', label: 'Mitigation', icon: 'ShieldCheck' },
  { id: 'simulator', label: 'Attack Simulator', icon: 'FlaskConical' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
  { id: 'logs', label: 'Logs & Audit', icon: 'ScrollText' },
  { id: 'reports', label: 'Reports', icon: 'FileText' },
  { id: 'users', label: 'Users', icon: 'Users' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
  { id: 'demo', label: 'Protected App', icon: 'Globe' },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]['id'];

export const DEMO_PATHS = ['/demo', '/demo/login', '/demo/api/products', '/demo/api/search', '/demo/checkout', '/demo/static/assets', '/demo/admin'];
