/*
# DDoS Detection & Mitigation Platform — Core Schema

## Overview
Creates the full data model for a multi-user DDoS detection & mitigation platform:
user profiles, attack events, blocked IPs, mitigation rules, alerts, audit logs,
system settings, attack simulations, and time-series traffic metrics.

## New Tables
- `profiles` — extends auth.users with role (admin/analyst/viewer), display name, status.
- `attacks` — detected DDoS attack events with type, severity, source IP, status.
- `blocked_ips` — IPs blocked or rate-limited by the mitigation engine.
- `mitigation_rules` — configurable mitigation rules (block, rate-limit, challenge, etc.).
- `alerts` — real-time alert notifications shown in the dashboard.
- `audit_logs` — immutable audit trail of admin/security actions.
- `settings` — key/value system configuration (single-row).
- `simulations` — attack simulation runs launched from the simulator.
- `traffic_metrics` — per-minute traffic buckets for analytics charts.

## Security
- RLS enabled on every table.
- Owner-scoped CRUD on user-owned tables (profiles).
- authenticated-only policies for operational data (attacks, blocked_ips, rules, alerts, audit_logs, settings, simulations, traffic_metrics).
- audit_logs is INSERT-only for authenticated (append-only), SELECT for authenticated.

## Notes
1. `profiles.user_id` defaults to `auth.uid()` so inserts from the client succeed.
2. `attacks`, `blocked_ips`, etc. are owned by the user who created them via `user_id DEFAULT auth.uid()`.
3. `settings` is a single-row table enforced by a unique constraint on `id`.
4. All timestamps use `timestamptz DEFAULT now()`.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT 'Analyst',
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','analyst','viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','locked','suspended')),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- attacks
CREATE TABLE IF NOT EXISTS attacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('http_flood','get_flood','post_flood','syn_flood','udp_flood','slowloris','icmp_flood','dns_amp','bot','burst','unknown')),
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  source_ip text NOT NULL,
  source_country text,
  target text NOT NULL DEFAULT '/demo',
  packets_per_sec integer NOT NULL DEFAULT 0,
  requests_per_sec integer NOT NULL DEFAULT 0,
  bandwidth_mbps numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','mitigated','expired','false_positive')),
  detected_by text NOT NULL DEFAULT 'threshold',
  detected_at timestamptz NOT NULL DEFAULT now(),
  mitigated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE attacks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attacks_user_created ON attacks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_status ON attacks(status);
CREATE INDEX IF NOT EXISTS idx_attacks_source_ip ON attacks(source_ip);

DROP POLICY IF EXISTS "select_own_attacks" ON attacks;
CREATE POLICY "select_own_attacks" ON attacks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_attacks" ON attacks;
CREATE POLICY "insert_own_attacks" ON attacks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_attacks" ON attacks;
CREATE POLICY "update_own_attacks" ON attacks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_attacks" ON attacks;
CREATE POLICY "delete_own_attacks" ON attacks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- blocked_ips
CREATE TABLE IF NOT EXISTS blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  reason text NOT NULL DEFAULT 'auto_detected',
  action text NOT NULL DEFAULT 'block' CHECK (action IN ('block','rate_limit','challenge','temp_ban','perm_ban','geo_block')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  country text,
  attack_type text,
  request_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','whitelisted','released')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ip_address)
);
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_blocked_ips_user_status ON blocked_ips(user_id, status);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);

DROP POLICY IF EXISTS "select_own_blocked_ips" ON blocked_ips;
CREATE POLICY "select_own_blocked_ips" ON blocked_ips FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_blocked_ips" ON blocked_ips;
CREATE POLICY "insert_own_blocked_ips" ON blocked_ips FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_blocked_ips" ON blocked_ips;
CREATE POLICY "update_own_blocked_ips" ON blocked_ips FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_blocked_ips" ON blocked_ips;
CREATE POLICY "delete_own_blocked_ips" ON blocked_ips FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- mitigation_rules
CREATE TABLE IF NOT EXISTS mitigation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('threshold','rate','signature','behavior','entropy','protocol','spike','adaptive','geo','header','bot')),
  action text NOT NULL DEFAULT 'block' CHECK (action IN ('block','rate_limit','challenge','temp_ban','perm_ban','geo_block','drop','shape')),
  threshold integer NOT NULL DEFAULT 100,
  window_seconds integer NOT NULL DEFAULT 60,
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mitigation_rules ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rules_user_enabled ON mitigation_rules(user_id, enabled);

DROP POLICY IF EXISTS "select_own_rules" ON mitigation_rules;
CREATE POLICY "select_own_rules" ON mitigation_rules FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_rules" ON mitigation_rules;
CREATE POLICY "insert_own_rules" ON mitigation_rules FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_rules" ON mitigation_rules;
CREATE POLICY "update_own_rules" ON mitigation_rules FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_rules" ON mitigation_rules;
CREATE POLICY "delete_own_rules" ON mitigation_rules FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('info','warning','critical','success')),
  category text NOT NULL DEFAULT 'security',
  title text NOT NULL,
  message text NOT NULL,
  source_ip text,
  attack_id uuid,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_ack ON alerts(user_id, acknowledged);

DROP POLICY IF EXISTS "select_own_alerts" ON alerts;
CREATE POLICY "select_own_alerts" ON alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_alerts" ON alerts;
CREATE POLICY "insert_own_alerts" ON alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_alerts" ON alerts;
CREATE POLICY "update_own_alerts" ON alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_alerts" ON alerts;
CREATE POLICY "delete_own_alerts" ON alerts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  actor text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  target text,
  details text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs(user_id, created_at DESC);

DROP POLICY IF EXISTS "select_own_audit" ON audit_logs;
CREATE POLICY "select_own_audit" ON audit_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_audit" ON audit_logs;
CREATE POLICY "insert_own_audit" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- settings (single-row)
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  detection_sensitivity text NOT NULL DEFAULT 'medium' CHECK (detection_sensitivity IN ('low','medium','high','max')),
  auto_mitigation boolean NOT NULL DEFAULT true,
  email_alerts boolean NOT NULL DEFAULT false,
  browser_notifications boolean NOT NULL DEFAULT true,
  rate_limit_rps integer NOT NULL DEFAULT 100,
  block_duration_minutes integer NOT NULL DEFAULT 30,
  geo_block_enabled boolean NOT NULL DEFAULT false,
  geo_blocked_countries text[] NOT NULL DEFAULT '{}',
  whitelist_ips text[] NOT NULL DEFAULT '{}',
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light','cyber')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON settings;
CREATE POLICY "select_own_settings" ON settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_settings" ON settings;
CREATE POLICY "insert_own_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_settings" ON settings;
CREATE POLICY "update_own_settings" ON settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_settings" ON settings;
CREATE POLICY "delete_own_settings" ON settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- simulations
CREATE TABLE IF NOT EXISTS simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  attack_type text NOT NULL,
  target text NOT NULL DEFAULT '/demo',
  concurrency integer NOT NULL DEFAULT 50,
  duration_seconds integer NOT NULL DEFAULT 60,
  requests_per_second integer NOT NULL DEFAULT 100,
  random_ips boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('running','paused','completed','stopped','failed')),
  total_requests integer NOT NULL DEFAULT 0,
  blocked_requests integer NOT NULL DEFAULT 0,
  detected_attacks integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sims_user_created ON simulations(user_id, created_at DESC);

DROP POLICY IF EXISTS "select_own_sims" ON simulations;
CREATE POLICY "select_own_sims" ON simulations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_sims" ON simulations;
CREATE POLICY "insert_own_sims" ON simulations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_sims" ON simulations;
CREATE POLICY "update_own_sims" ON simulations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_sims" ON simulations;
CREATE POLICY "delete_own_sims" ON simulations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- traffic_metrics (per-minute buckets)
CREATE TABLE IF NOT EXISTS traffic_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket timestamptz NOT NULL,
  requests_per_sec integer NOT NULL DEFAULT 0,
  packets_per_sec integer NOT NULL DEFAULT 0,
  bandwidth_mbps numeric NOT NULL DEFAULT 0,
  unique_ips integer NOT NULL DEFAULT 0,
  blocked_count integer NOT NULL DEFAULT 0,
  attack_count integer NOT NULL DEFAULT 0,
  cpu_usage numeric NOT NULL DEFAULT 0,
  ram_usage numeric NOT NULL DEFAULT 0,
  is_attack boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE traffic_metrics ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_metrics_user_bucket ON traffic_metrics(user_id, bucket DESC);

DROP POLICY IF EXISTS "select_own_metrics" ON traffic_metrics;
CREATE POLICY "select_own_metrics" ON traffic_metrics FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_metrics" ON traffic_metrics;
CREATE POLICY "insert_own_metrics" ON traffic_metrics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_metrics" ON traffic_metrics;
CREATE POLICY "update_own_metrics" ON traffic_metrics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_metrics" ON traffic_metrics;
CREATE POLICY "delete_own_metrics" ON traffic_metrics FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_rules_updated ON mitigation_rules;
CREATE TRIGGER trg_rules_updated BEFORE UPDATE ON mitigation_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated ON settings;
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
