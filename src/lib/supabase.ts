import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Asset {
  id: string;
  hostname: string;
  ip_address: string | null;
  asset_type: string;
  operating_system: string | null;
  owner: string | null;
  criticality: string;
  status: string;
  tags: string[];
  installed_software: Json;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  source: string | null;
  source_ip: string | null;
  destination_ip: string | null;
  asset_id: string | null;
  mitre_tactic: string | null;
  mitre_technique: string | null;
  mitre_technique_id: string | null;
  raw_log: string | null;
  assignee: string | null;
  tags: string[];
  false_positive: boolean;
  suppressed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  priority: string;
  assignee: string | null;
  affected_assets: string[];
  timeline: Json;
  notes: string[];
  containment_actions: string[];
  evidence: Json;
  lessons_learned: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiemEvent {
  id: string;
  event_type: string;
  source_type: string;
  hostname: string | null;
  source_ip: string | null;
  destination_ip: string | null;
  port: number | null;
  protocol: string | null;
  user_name: string | null;
  process_name: string | null;
  raw_log: string | null;
  parsed_fields: Json;
  severity: string;
  mitre_tactic: string | null;
  mitre_technique: string | null;
  alert_generated: boolean;
  created_at: string;
}

export interface ThreatIntel {
  id: string;
  indicator_type: string;
  indicator_value: string;
  threat_score: number;
  confidence: number;
  severity: string;
  malware_family: string | null;
  threat_actor: string | null;
  campaign: string | null;
  description: string | null;
  source: string | null;
  tags: string[];
  first_seen: string;
  last_seen: string;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

export interface Vulnerability {
  id: string;
  cve_id: string | null;
  title: string;
  description: string | null;
  severity: string;
  cvss_score: number | null;
  cvss_vector: string | null;
  asset_id: string | null;
  asset_hostname: string | null;
  plugin_id: string | null;
  port: number | null;
  protocol: string | null;
  service: string | null;
  solution: string | null;
  exploit_available: boolean;
  patch_available: boolean;
  status: string;
  first_detected: string;
  last_detected: string;
  remediated_at: string | null;
  created_at: string;
}

export interface MalwareSample {
  id: string;
  filename: string;
  file_size: number | null;
  file_type: string | null;
  md5: string | null;
  sha1: string | null;
  sha256: string | null;
  entropy: number | null;
  risk_score: number;
  status: string;
  malware_family: string | null;
  is_malicious: boolean | null;
  vt_detections: number | null;
  vt_total: number | null;
  vt_link: string | null;
  strings_extracted: string[];
  imports: string[];
  exports: string[];
  yara_matches: string[];
  iocs: Json;
  behavior: Json;
  mitre_techniques: string[];
  analysis_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OsintSearch {
  id: string;
  query_type: string;
  query_value: string;
  results: Json;
  risk_rating: string | null;
  status: string;
  analyst: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Playbook {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_condition: Json;
  steps: Json;
  enabled: boolean;
  run_count: number;
  last_run: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForensicCase {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  examiner: string | null;
  incident_id: string | null;
  evidence_items: Json;
  artifacts: Json;
  chain_of_custody: Json;
  timeline_events: Json;
  findings: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorrelationRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  conditions: Json;
  severity: string;
  mitre_tactic: string | null;
  mitre_technique: string | null;
  enabled: boolean;
  hit_count: number;
  last_hit: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  role: string;
  department: string | null;
  active: boolean;
  last_login: string | null;
  permissions: string[];
  created_at: string;
}

export interface Report {
  id: string;
  title: string;
  report_type: string;
  status: string;
  generated_by: string | null;
  parameters: Json;
  summary: string | null;
  data: Json;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  actor: string | null;
  details: Json;
  ip_address: string | null;
  created_at: string;
}

export interface SiemSource {
  id: string;
  name: string;
  source_type: string;
  integration: string;
  description: string | null;
  host: string | null;
  port: number | null;
  protocol: string | null;
  tls_enabled: boolean;
  auth_method: string;
  api_key: string | null;
  status: string;
  events_today: number;
  events_total: number;
  last_event: string | null;
  last_heartbeat: string | null;
  config: Json;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SiemAgent {
  id: string;
  agent_id: string;
  name: string;
  source_id: string | null;
  hostname: string | null;
  ip_address: string | null;
  os_name: string | null;
  os_version: string | null;
  os_platform: string | null;
  agent_version: string | null;
  status: string;
  enrollment_key: string | null;
  groups: string[];
  labels: Json;
  last_heartbeat: string | null;
  events_today: number;
  events_total: number;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
}
