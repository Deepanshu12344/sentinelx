/*
# SentinelX Core Schema

1. New Tables
   - `assets` - IT asset inventory (servers, workstations, containers, network devices)
   - `alerts` - Security alerts with severity, status, MITRE mapping
   - `incidents` - Security incidents with full lifecycle tracking
   - `siem_events` - Raw and normalized log events
   - `threat_intel` - Threat intelligence indicators (IOCs)
   - `vulnerabilities` - CVE-based vulnerability findings
   - `malware_samples` - Malware analysis submissions and results
   - `osint_searches` - OSINT investigation records
   - `playbooks` - SOAR playbook definitions
   - `playbook_executions` - Playbook run history
   - `forensic_cases` - Digital forensics cases
   - `threat_feeds` - Threat feed source configurations
   - `users_profile` - SOC user profiles with roles
   - `audit_logs` - System audit trail
   - `correlation_rules` - SIEM correlation rules
   - `reports` - Generated report records

2. Security
   - RLS enabled on all tables
   - Public/shared SOC platform uses anon+authenticated access
*/

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname text NOT NULL,
  ip_address text,
  asset_type text NOT NULL DEFAULT 'workstation',
  operating_system text,
  owner text,
  criticality text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'active',
  tags text[] DEFAULT '{}',
  installed_software jsonb DEFAULT '[]',
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_assets" ON assets;
CREATE POLICY "anon_select_assets" ON assets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_assets" ON assets;
CREATE POLICY "anon_insert_assets" ON assets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_assets" ON assets;
CREATE POLICY "anon_update_assets" ON assets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_assets" ON assets;
CREATE POLICY "anon_delete_assets" ON assets FOR DELETE TO anon, authenticated USING (true);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  source text,
  source_ip text,
  destination_ip text,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  mitre_tactic text,
  mitre_technique text,
  mitre_technique_id text,
  raw_log text,
  assignee text,
  tags text[] DEFAULT '{}',
  false_positive boolean DEFAULT false,
  suppressed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE TO anon, authenticated USING (true);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'p2',
  assignee text,
  affected_assets text[] DEFAULT '{}',
  timeline jsonb DEFAULT '[]',
  notes text[] DEFAULT '{}',
  containment_actions text[] DEFAULT '{}',
  evidence jsonb DEFAULT '[]',
  lessons_learned text,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_incidents" ON incidents;
CREATE POLICY "anon_select_incidents" ON incidents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_incidents" ON incidents;
CREATE POLICY "anon_insert_incidents" ON incidents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_incidents" ON incidents;
CREATE POLICY "anon_update_incidents" ON incidents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_incidents" ON incidents;
CREATE POLICY "anon_delete_incidents" ON incidents FOR DELETE TO anon, authenticated USING (true);

-- SIEM events table
CREATE TABLE IF NOT EXISTS siem_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source_type text NOT NULL DEFAULT 'syslog',
  hostname text,
  source_ip text,
  destination_ip text,
  port integer,
  protocol text,
  user_name text,
  process_name text,
  raw_log text,
  parsed_fields jsonb DEFAULT '{}',
  severity text NOT NULL DEFAULT 'info',
  mitre_tactic text,
  mitre_technique text,
  alert_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE siem_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_siem_events" ON siem_events;
CREATE POLICY "anon_select_siem_events" ON siem_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_siem_events" ON siem_events;
CREATE POLICY "anon_insert_siem_events" ON siem_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_siem_events" ON siem_events;
CREATE POLICY "anon_update_siem_events" ON siem_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_siem_events" ON siem_events;
CREATE POLICY "anon_delete_siem_events" ON siem_events FOR DELETE TO anon, authenticated USING (true);

-- Threat intelligence indicators
CREATE TABLE IF NOT EXISTS threat_intel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_type text NOT NULL,
  indicator_value text NOT NULL,
  threat_score integer DEFAULT 50,
  confidence integer DEFAULT 70,
  severity text NOT NULL DEFAULT 'medium',
  malware_family text,
  threat_actor text,
  campaign text,
  description text,
  source text,
  tags text[] DEFAULT '{}',
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  expires_at timestamptz,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE threat_intel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_threat_intel" ON threat_intel;
CREATE POLICY "anon_select_threat_intel" ON threat_intel FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_threat_intel" ON threat_intel;
CREATE POLICY "anon_insert_threat_intel" ON threat_intel FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_threat_intel" ON threat_intel;
CREATE POLICY "anon_update_threat_intel" ON threat_intel FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_threat_intel" ON threat_intel;
CREATE POLICY "anon_delete_threat_intel" ON threat_intel FOR DELETE TO anon, authenticated USING (true);

-- Vulnerabilities table
CREATE TABLE IF NOT EXISTS vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cve_id text,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  cvss_score numeric(4,2),
  cvss_vector text,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  asset_hostname text,
  plugin_id text,
  port integer,
  protocol text,
  service text,
  solution text,
  exploit_available boolean DEFAULT false,
  patch_available boolean DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  first_detected timestamptz DEFAULT now(),
  last_detected timestamptz DEFAULT now(),
  remediated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_vulnerabilities" ON vulnerabilities;
CREATE POLICY "anon_select_vulnerabilities" ON vulnerabilities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vulnerabilities" ON vulnerabilities;
CREATE POLICY "anon_insert_vulnerabilities" ON vulnerabilities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vulnerabilities" ON vulnerabilities;
CREATE POLICY "anon_update_vulnerabilities" ON vulnerabilities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vulnerabilities" ON vulnerabilities;
CREATE POLICY "anon_delete_vulnerabilities" ON vulnerabilities FOR DELETE TO anon, authenticated USING (true);

-- Malware samples table
CREATE TABLE IF NOT EXISTS malware_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_size bigint,
  file_type text,
  md5 text,
  sha1 text,
  sha256 text,
  entropy numeric(6,4),
  risk_score integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  malware_family text,
  is_malicious boolean,
  vt_detections integer,
  vt_total integer,
  vt_link text,
  strings_extracted text[] DEFAULT '{}',
  imports text[] DEFAULT '{}',
  exports text[] DEFAULT '{}',
  yara_matches text[] DEFAULT '{}',
  iocs jsonb DEFAULT '[]',
  behavior jsonb DEFAULT '{}',
  mitre_techniques text[] DEFAULT '{}',
  analysis_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE malware_samples ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_malware_samples" ON malware_samples;
CREATE POLICY "anon_select_malware_samples" ON malware_samples FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_malware_samples" ON malware_samples;
CREATE POLICY "anon_insert_malware_samples" ON malware_samples FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_malware_samples" ON malware_samples;
CREATE POLICY "anon_update_malware_samples" ON malware_samples FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_malware_samples" ON malware_samples;
CREATE POLICY "anon_delete_malware_samples" ON malware_samples FOR DELETE TO anon, authenticated USING (true);

-- OSINT searches table
CREATE TABLE IF NOT EXISTS osint_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_type text NOT NULL,
  query_value text NOT NULL,
  results jsonb DEFAULT '{}',
  risk_rating text,
  status text NOT NULL DEFAULT 'pending',
  analyst text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE osint_searches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_osint_searches" ON osint_searches;
CREATE POLICY "anon_select_osint_searches" ON osint_searches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_osint_searches" ON osint_searches;
CREATE POLICY "anon_insert_osint_searches" ON osint_searches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_osint_searches" ON osint_searches;
CREATE POLICY "anon_update_osint_searches" ON osint_searches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_osint_searches" ON osint_searches;
CREATE POLICY "anon_delete_osint_searches" ON osint_searches FOR DELETE TO anon, authenticated USING (true);

-- Playbooks table
CREATE TABLE IF NOT EXISTS playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'manual',
  trigger_condition jsonb DEFAULT '{}',
  steps jsonb DEFAULT '[]',
  enabled boolean DEFAULT true,
  run_count integer DEFAULT 0,
  last_run timestamptz,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_playbooks" ON playbooks;
CREATE POLICY "anon_select_playbooks" ON playbooks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_playbooks" ON playbooks;
CREATE POLICY "anon_insert_playbooks" ON playbooks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_playbooks" ON playbooks;
CREATE POLICY "anon_update_playbooks" ON playbooks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_playbooks" ON playbooks;
CREATE POLICY "anon_delete_playbooks" ON playbooks FOR DELETE TO anon, authenticated USING (true);

-- Playbook executions
CREATE TABLE IF NOT EXISTS playbook_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid REFERENCES playbooks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  triggered_by text,
  context jsonb DEFAULT '{}',
  steps_results jsonb DEFAULT '[]',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE playbook_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_pb_exec" ON playbook_executions;
CREATE POLICY "anon_select_pb_exec" ON playbook_executions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pb_exec" ON playbook_executions;
CREATE POLICY "anon_insert_pb_exec" ON playbook_executions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pb_exec" ON playbook_executions;
CREATE POLICY "anon_update_pb_exec" ON playbook_executions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pb_exec" ON playbook_executions;
CREATE POLICY "anon_delete_pb_exec" ON playbook_executions FOR DELETE TO anon, authenticated USING (true);

-- Forensic cases
CREATE TABLE IF NOT EXISTS forensic_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  examiner text,
  incident_id uuid REFERENCES incidents(id) ON DELETE SET NULL,
  evidence_items jsonb DEFAULT '[]',
  artifacts jsonb DEFAULT '[]',
  chain_of_custody jsonb DEFAULT '[]',
  timeline_events jsonb DEFAULT '[]',
  findings text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE forensic_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_forensic_cases" ON forensic_cases;
CREATE POLICY "anon_select_forensic_cases" ON forensic_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_forensic_cases" ON forensic_cases;
CREATE POLICY "anon_insert_forensic_cases" ON forensic_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_forensic_cases" ON forensic_cases;
CREATE POLICY "anon_update_forensic_cases" ON forensic_cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_forensic_cases" ON forensic_cases;
CREATE POLICY "anon_delete_forensic_cases" ON forensic_cases FOR DELETE TO anon, authenticated USING (true);

-- Correlation rules
CREATE TABLE IF NOT EXISTS correlation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rule_type text NOT NULL DEFAULT 'threshold',
  conditions jsonb DEFAULT '{}',
  severity text NOT NULL DEFAULT 'medium',
  mitre_tactic text,
  mitre_technique text,
  enabled boolean DEFAULT true,
  hit_count integer DEFAULT 0,
  last_hit timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE correlation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_correlation_rules" ON correlation_rules;
CREATE POLICY "anon_select_correlation_rules" ON correlation_rules FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_correlation_rules" ON correlation_rules;
CREATE POLICY "anon_insert_correlation_rules" ON correlation_rules FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_correlation_rules" ON correlation_rules;
CREATE POLICY "anon_update_correlation_rules" ON correlation_rules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_correlation_rules" ON correlation_rules;
CREATE POLICY "anon_delete_correlation_rules" ON correlation_rules FOR DELETE TO anon, authenticated USING (true);

-- Users profile table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  full_name text,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'analyst',
  department text,
  active boolean DEFAULT true,
  last_login timestamptz,
  permissions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_user_profiles" ON user_profiles;
CREATE POLICY "anon_select_user_profiles" ON user_profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_user_profiles" ON user_profiles;
CREATE POLICY "anon_insert_user_profiles" ON user_profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_user_profiles" ON user_profiles;
CREATE POLICY "anon_update_user_profiles" ON user_profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_user_profiles" ON user_profiles;
CREATE POLICY "anon_delete_user_profiles" ON user_profiles FOR DELETE TO anon, authenticated USING (true);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  resource_type text,
  resource_id text,
  actor text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_audit_logs" ON audit_logs;
CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit_logs" ON audit_logs;
CREATE POLICY "anon_insert_audit_logs" ON audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_audit_logs" ON audit_logs;
CREATE POLICY "anon_update_audit_logs" ON audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_audit_logs" ON audit_logs;
CREATE POLICY "anon_delete_audit_logs" ON audit_logs FOR DELETE TO anon, authenticated USING (true);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  report_type text NOT NULL,
  status text NOT NULL DEFAULT 'generating',
  generated_by text,
  parameters jsonb DEFAULT '{}',
  summary text,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_reports" ON reports;
CREATE POLICY "anon_select_reports" ON reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_reports" ON reports;
CREATE POLICY "anon_insert_reports" ON reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_reports" ON reports;
CREATE POLICY "anon_update_reports" ON reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_reports" ON reports;
CREATE POLICY "anon_delete_reports" ON reports FOR DELETE TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_siem_events_created_at ON siem_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_siem_events_severity ON siem_events(severity);
CREATE INDEX IF NOT EXISTS idx_siem_events_source_type ON siem_events(source_type);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_threat_intel_type ON threat_intel(indicator_type);
CREATE INDEX IF NOT EXISTS idx_threat_intel_value ON threat_intel(indicator_value);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
