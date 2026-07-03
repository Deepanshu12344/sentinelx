/*
# SIEM Data Sources & Agent Registry

Adds two tables for managing SIEM data sources and monitoring agents
(analogous to Wazuh agents / Elastic Beats / Splunk forwarders).

1. New Tables
   - `siem_sources` — registered data sources (Wazuh, Syslog, Beats, etc.)
     with connection config, status, and ingestion counters
   - `siem_agents` — individual agents/forwarders reporting to SentinelX
     with OS info, version, last heartbeat, and enrollment status

2. Security
   - RLS enabled on both tables
   - anon + authenticated access (single-tenant SOC platform)
*/

CREATE TABLE IF NOT EXISTS siem_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL,
  integration text NOT NULL DEFAULT 'syslog',
  description text,
  host text,
  port integer,
  protocol text DEFAULT 'tcp',
  tls_enabled boolean DEFAULT false,
  auth_method text DEFAULT 'none',
  api_key text,
  status text NOT NULL DEFAULT 'active',
  events_today integer DEFAULT 0,
  events_total bigint DEFAULT 0,
  last_event timestamptz,
  last_heartbeat timestamptz DEFAULT now(),
  config jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE siem_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_siem_sources" ON siem_sources;
CREATE POLICY "anon_select_siem_sources" ON siem_sources FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_siem_sources" ON siem_sources;
CREATE POLICY "anon_insert_siem_sources" ON siem_sources FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_siem_sources" ON siem_sources;
CREATE POLICY "anon_update_siem_sources" ON siem_sources FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_siem_sources" ON siem_sources;
CREATE POLICY "anon_delete_siem_sources" ON siem_sources FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS siem_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text UNIQUE NOT NULL,
  name text NOT NULL,
  source_id uuid REFERENCES siem_sources(id) ON DELETE SET NULL,
  hostname text,
  ip_address text,
  os_name text,
  os_version text,
  os_platform text,
  agent_version text,
  status text NOT NULL DEFAULT 'active',
  enrollment_key text,
  groups text[] DEFAULT '{}',
  labels jsonb DEFAULT '{}',
  last_heartbeat timestamptz DEFAULT now(),
  events_today integer DEFAULT 0,
  events_total bigint DEFAULT 0,
  disconnected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE siem_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_siem_agents" ON siem_agents;
CREATE POLICY "anon_select_siem_agents" ON siem_agents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_siem_agents" ON siem_agents;
CREATE POLICY "anon_insert_siem_agents" ON siem_agents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_siem_agents" ON siem_agents;
CREATE POLICY "anon_update_siem_agents" ON siem_agents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_siem_agents" ON siem_agents;
CREATE POLICY "anon_delete_siem_agents" ON siem_agents FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_siem_agents_status ON siem_agents(status);
CREATE INDEX IF NOT EXISTS idx_siem_agents_source_id ON siem_agents(source_id);
CREATE INDEX IF NOT EXISTS idx_siem_sources_status ON siem_sources(status);
