import React, { useEffect, useState, useCallback } from 'react';
import { Filter, PlusCircle, Server, Cpu, Wifi, Cloud, Activity, CheckCircle, AlertTriangle, XCircle, Radio, RefreshCw, Trash2, Edit2, Copy, Download } from 'lucide-react';
import { supabase, SiemEvent, SiemSource, SiemAgent } from '../lib/supabase';
import { Panel, SearchInput, Select, Badge, Button, Modal, Textarea, Input, Table } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

const SOURCE_TYPES = [
  { value: '', label: 'All Sources' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
  { value: 'sysmon', label: 'Sysmon' },
  { value: 'apache', label: 'Apache' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'vpn', label: 'VPN' },
];

const SEVERITIES = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'info', label: 'Info' },
];

const INTEGRATIONS = [
  { value: 'wazuh', label: 'Wazuh' },
  { value: 'syslog', label: 'Syslog (RFC 5424)' },
  { value: 'winrm', label: 'Windows Event Forwarding' },
  { value: 'filebeat', label: 'Elastic Filebeat' },
  { value: 'fluentd', label: 'Fluentd' },
  { value: 'logstash', label: 'Logstash' },
  { value: 'cloudtrail', label: 'AWS CloudTrail' },
  { value: 'azure', label: 'Azure Monitor' },
  { value: 'zeek', label: 'Zeek (Bro)' },
  { value: 'ossec', label: 'OSSEC' },
  { value: 'nxlog', label: 'NXLog' },
  { value: 'snmp', label: 'SNMP Trap' },
  { value: 'api', label: 'REST API / Webhook' },
];

const INTEGRATION_SOURCE_TYPES = [
  { value: 'edr', label: 'EDR / Endpoint' },
  { value: 'windows', label: 'Windows Events' },
  { value: 'linux', label: 'Linux / Unix' },
  { value: 'web', label: 'Web Server' },
  { value: 'firewall', label: 'Firewall / Network' },
  { value: 'vpn', label: 'VPN' },
  { value: 'cloud', label: 'Cloud Provider' },
  { value: 'container', label: 'Container / K8s' },
  { value: 'ids', label: 'IDS / IPS' },
  { value: 'database', label: 'Database' },
  { value: 'email', label: 'Email Gateway' },
];

const integrationIcon = (integration: string) => {
  switch (integration) {
    case 'wazuh': return <WazuhIcon />;
    case 'cloudtrail':
    case 'azure': return <Cloud size={15} className="text-blue-400" />;
    case 'zeek':
    case 'snmp': return <Wifi size={15} className="text-green-400" />;
    case 'fluentd':
    case 'filebeat':
    case 'logstash': return <Activity size={15} className="text-orange-400" />;
    default: return <Server size={15} style={{ color: 'var(--text-secondary)' }} />;
  }
};

const statusDot = (status: string) => {
  switch (status) {
    case 'active': return <span className="inline-block w-2 h-2 rounded-full bg-green-400" />;
    case 'warning': return <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />;
    case 'error': return <span className="inline-block w-2 h-2 rounded-full bg-red-400" />;
    case 'inactive': return <span className="inline-block w-2 h-2 rounded-full bg-gray-600" />;
    default: return <span className="inline-block w-2 h-2 rounded-full bg-gray-600" />;
  }
};

const agentStatusDot = (status: string) => {
  switch (status) {
    case 'active': return <span className="flex items-center gap-1.5 text-green-400 text-xs"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Active</span>;
    case 'disconnected': return <span className="flex items-center gap-1.5 text-red-400 text-xs"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Disconnected</span>;
    case 'outdated': return <span className="flex items-center gap-1.5 text-yellow-400 text-xs"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Outdated</span>;
    case 'pending': return <span className="flex items-center gap-1.5 text-blue-400 text-xs"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block animate-pulse" />Pending</span>;
    default: return <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />{status}</span>;
  }
};

const osPlatformIcon = (platform: string) => {
  switch (platform?.toLowerCase()) {
    case 'windows': return <span className="text-blue-400 text-xs">WIN</span>;
    case 'ubuntu':
    case 'debian':
    case 'rhel':
    case 'centos':
    case 'linux': return <span className="text-orange-400 text-xs">LNX</span>;
    case 'darwin': return <span className="text-gray-300 text-xs">MAC</span>;
    case 'panos': return <span className="text-yellow-400 text-xs">NET</span>;
    default: return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{platform?.slice(0, 3).toUpperCase() || '???'}</span>;
  }
};

function WazuhIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-blue-500">
      <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 2v20M3 7l9 5 9-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

type SIEMTab = 'events' | 'sources' | 'agents';

export default function SIEM() {
  const [activeTab, setActiveTab] = useState<SIEMTab>('events');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex gap-0 px-4 flex-shrink-0" style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
        {([
          { id: 'events', label: 'Event Log' },
          { id: 'sources', label: 'Data Sources' },
          { id: 'agents', label: 'Agents' },
        ] as { id: SIEMTab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${activeTab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent hover:text-gray-300'}`}
            style={activeTab === t.id ? undefined : { color: 'var(--text-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'events' && <EventLog />}
        {activeTab === 'sources' && <DataSources />}
        {activeTab === 'agents' && <AgentManager />}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────── Event Log ── */
function EventLog() {
  const [events, setEvents] = useState<SiemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selected, setSelected] = useState<SiemEvent | null>(null);
  const [showIngest, setShowIngest] = useState(false);
  const [newLog, setNewLog] = useState({ source_type: 'windows', hostname: '', source_ip: '', user_name: '', event_type: '', raw_log: '', severity: 'medium' });
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => { fetchEvents(); }, [sourceFilter, severityFilter]);

  async function fetchEvents() {
    setLoading(true);
    let q = supabase.from('siem_events').select('*').order('created_at', { ascending: false }).limit(500);
    if (sourceFilter) q = q.eq('source_type', sourceFilter);
    if (severityFilter) q = q.eq('severity', severityFilter);
    const { data } = await q;
    setEvents(data || []);
    setLoading(false);
  }

  const filtered = events.filter(e =>
    !search ||
    e.event_type.toLowerCase().includes(search.toLowerCase()) ||
    (e.hostname || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.source_ip || '').includes(search) ||
    (e.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.raw_log || '').toLowerCase().includes(search.toLowerCase())
  );

  async function ingestLog() {
    setIngesting(true);
    await supabase.from('siem_events').insert([{
      event_type: newLog.event_type || 'manual_entry',
      source_type: newLog.source_type,
      hostname: newLog.hostname || null,
      source_ip: newLog.source_ip || null,
      user_name: newLog.user_name || null,
      severity: newLog.severity,
      raw_log: newLog.raw_log || null,
    }]);
    setIngesting(false);
    setShowIngest(false);
    setNewLog({ source_type: 'windows', hostname: '', source_ip: '', user_name: '', event_type: '', raw_log: '', severity: 'medium' });
    fetchEvents();
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-5 gap-3">
        {['all', 'critical', 'high', 'medium', 'low'].map(sev => {
          const count = sev === 'all' ? events.length : events.filter(e => e.severity === sev).length;
          const colors: Record<string, string> = {
            all: 'border-gray-600 text-gray-200',
            critical: 'border-red-700 text-red-400',
            high: 'border-orange-700 text-orange-400',
            medium: 'border-yellow-700 text-yellow-400',
            low: 'border-blue-700 text-blue-400',
          };
          return (
            <button key={sev} onClick={() => setSeverityFilter(sev === 'all' ? '' : sev)}
              className={`rounded border p-3 text-left transition-colors ${(sev === 'all' && !severityFilter) || severityFilter === sev ? 'border-blue-500' : colors[sev].split(' ')[0]}`}
              style={{ backgroundColor: 'var(--bg-surface)' }}>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{sev === 'all' ? 'Total Events' : sev}</div>
              <div className={`text-xl font-bold font-mono ${colors[sev].split(' ')[1]}`}>{count}</div>
            </button>
          );
        })}
      </div>

      <Panel title="Event Log" actions={
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search events..." className="w-56" />
          <Select value={sourceFilter} onChange={setSourceFilter} options={SOURCE_TYPES} />
          <Select value={severityFilter} onChange={setSeverityFilter} options={SEVERITIES} />
          <Button variant="secondary" onClick={fetchEvents}><RefreshCw size={13} /> Refresh</Button>
          <Button onClick={() => setShowIngest(true)}><PlusCircle size={13} /> Ingest Log</Button>
        </div>
      }>
        <Table
          columns={[
            { key: 'time', label: 'Timestamp', width: 'w-44' },
            { key: 'severity', label: 'Severity', width: 'w-24' },
            { key: 'source_type', label: 'Source', width: 'w-24' },
            { key: 'hostname', label: 'Host', width: 'w-32' },
            { key: 'event_type', label: 'Event Type', width: 'w-40' },
            { key: 'source_ip', label: 'Src IP', width: 'w-32' },
            { key: 'user_name', label: 'User', width: 'w-28' },
            { key: 'mitre', label: 'MITRE', width: 'w-44' },
          ]}
          rows={filtered.map(e => ({
            time: <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(e.created_at)}</span>,
            severity: <Badge text={e.severity} type="severity" />,
            source_type: <span className="text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>{e.source_type}</span>,
            hostname: <span className="text-xs font-mono text-gray-300">{e.hostname || '-'}</span>,
            event_type: <span className="text-xs text-gray-300">{e.event_type}</span>,
            source_ip: <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{e.source_ip || '-'}</span>,
            user_name: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{e.user_name || '-'}</span>,
            mitre: e.mitre_technique
              ? <span className="text-xs text-blue-400">{e.mitre_tactic} / {e.mitre_technique}</span>
              : <span className="text-gray-700">-</span>,
          }))}
          loading={loading}
          onRowClick={i => setSelected(filtered[i])}
          emptyMessage="No events found"
        />
        <div className="px-4 py-2 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {events.length} events
        </div>
      </Panel>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Event Detail" width="max-w-3xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span style={{ color: 'var(--text-muted)' }}>Timestamp:</span> <span className="text-gray-300 font-mono">{formatDate(selected.created_at)}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Severity:</span> <Badge text={selected.severity} type="severity" /></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Source Type:</span> <span className="text-gray-300">{selected.source_type}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Event Type:</span> <span className="text-gray-300">{selected.event_type}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Hostname:</span> <span className="text-gray-300 font-mono">{selected.hostname || '-'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Source IP:</span> <span className="text-gray-300 font-mono">{selected.source_ip || '-'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Dest IP:</span> <span className="text-gray-300 font-mono">{selected.destination_ip || '-'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>User:</span> <span className="text-gray-300">{selected.user_name || '-'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Process:</span> <span className="text-gray-300 font-mono">{selected.process_name || '-'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>MITRE Tactic:</span> <span className="text-blue-400">{selected.mitre_tactic || '-'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>MITRE Technique:</span> <span className="text-blue-400">{selected.mitre_technique || '-'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Alert Generated:</span> <span className={selected.alert_generated ? 'text-red-400' : 'text-gray-400'}>{selected.alert_generated ? 'Yes' : 'No'}</span></div>
            </div>
            {selected.raw_log && (
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Raw Log</div>
                <pre className="border rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: '#4ade80' }}>{selected.raw_log}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={showIngest} onClose={() => setShowIngest(false)} title="Ingest Log Entry">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Source Type</label>
              <Select value={newLog.source_type} onChange={v => setNewLog(p => ({ ...p, source_type: v }))} options={SOURCE_TYPES.slice(1)} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Severity</label>
              <Select value={newLog.severity} onChange={v => setNewLog(p => ({ ...p, severity: v }))} options={SEVERITIES.slice(1)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Hostname" value={newLog.hostname} onChange={e => setNewLog(p => ({ ...p, hostname: e.target.value }))} placeholder="hostname" />
            <Input label="Source IP" value={newLog.source_ip} onChange={e => setNewLog(p => ({ ...p, source_ip: e.target.value }))} placeholder="10.0.0.1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Username" value={newLog.user_name} onChange={e => setNewLog(p => ({ ...p, user_name: e.target.value }))} placeholder="username" />
            <Input label="Event Type" value={newLog.event_type} onChange={e => setNewLog(p => ({ ...p, event_type: e.target.value }))} placeholder="authentication_failure" />
          </div>
          <Textarea label="Raw Log" value={newLog.raw_log} onChange={e => setNewLog(p => ({ ...p, raw_log: e.target.value }))} rows={4} placeholder="Paste raw log entry..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowIngest(false)}>Cancel</Button>
            <Button onClick={ingestLog} disabled={ingesting}>{ingesting ? 'Ingesting...' : 'Ingest Log'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ────────────────────────────────────────────────── Data Sources ── */
function DataSources() {
  const [sources, setSources] = useState<SiemSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SiemSource | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', source_type: 'edr', integration: 'wazuh',
    description: '', host: '', port: '', protocol: 'tcp',
    tls_enabled: false, auth_method: 'none', api_key: '',
  });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, 'ok' | 'fail' | 'testing'>>({});

  useEffect(() => { fetchSources(); }, []);

  async function fetchSources() {
    setLoading(true);
    const { data } = await supabase.from('siem_sources').select('*').order('events_today', { ascending: false });
    setSources(data || []);
    setLoading(false);
  }

  const filtered = sources.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.integration.toLowerCase().includes(search.toLowerCase()) ||
    (s.host || '').includes(search) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  async function addSource() {
    setSaving(true);
    await supabase.from('siem_sources').insert([{
      name: form.name,
      source_type: form.source_type,
      integration: form.integration,
      description: form.description || null,
      host: form.host || null,
      port: form.port ? parseInt(form.port) : null,
      protocol: form.protocol,
      tls_enabled: form.tls_enabled,
      auth_method: form.auth_method,
      api_key: form.api_key || null,
      status: 'active',
      events_today: 0,
      events_total: 0,
    }]);
    setSaving(false);
    setShowAdd(false);
    setForm({ name: '', source_type: 'edr', integration: 'wazuh', description: '', host: '', port: '', protocol: 'tcp', tls_enabled: false, auth_method: 'none', api_key: '' });
    fetchSources();
  }

  async function testConnection(id: string) {
    setTestResult(p => ({ ...p, [id]: 'testing' }));
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
    const src = sources.find(s => s.id === id);
    const ok = src?.status === 'active';
    setTestResult(p => ({ ...p, [id]: ok ? 'ok' : 'fail' }));
    setTimeout(() => setTestResult(p => { const n = { ...p }; delete n[id]; return n; }), 4000);
  }

  async function toggleStatus(id: string, status: string) {
    const next = status === 'active' ? 'inactive' : 'active';
    await supabase.from('siem_sources').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id);
    fetchSources();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: next } : null);
  }

  async function deleteSource(id: string) {
    await supabase.from('siem_sources').delete().eq('id', id);
    setSelected(null);
    fetchSources();
  }

  const totalEventsToday = sources.reduce((acc, s) => acc + (s.events_today || 0), 0);
  const activeSources = sources.filter(s => s.status === 'active').length;
  const warningSources = sources.filter(s => s.status === 'warning').length;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="border rounded p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Sources</div>
          <div className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{sources.length}</div>
        </div>
        <div className="border border-green-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Active</div>
          <div className="text-2xl font-bold font-mono text-green-400">{activeSources}</div>
        </div>
        <div className="border border-yellow-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Warning</div>
          <div className="text-2xl font-bold font-mono text-yellow-400">{warningSources}</div>
        </div>
        <div className="border border-blue-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Events Today</div>
          <div className="text-2xl font-bold font-mono text-blue-400">{totalEventsToday.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Source List */}
        <div className="xl:col-span-2">
          <Panel title="Registered Data Sources" actions={
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search sources..." className="w-48" />
              <Button onClick={fetchSources} variant="secondary"><RefreshCw size={13} /></Button>
              <Button onClick={() => setShowAdd(true)}><PlusCircle size={13} /> Add Source</Button>
            </div>
          }>
            <div className="divide-y">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-4 py-3"><div className="h-5 bg-gray-700 rounded animate-pulse" /></div>
                ))
              ) : filtered.map(src => {
                const tr = testResult[src.id];
                return (
                  <div key={src.id}
                    className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-700/20 transition-colors ${selected?.id === src.id ? 'bg-blue-900/10 border-l-2 border-blue-500' : ''}`}
                    onClick={() => setSelected(src)}>
                    <div className="flex-shrink-0">{integrationIcon(src.integration)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {statusDot(src.status)}
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{src.name}</span>
                        <span className="text-xs font-mono bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-gray-600">{src.integration}</span>
                      </div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {src.host ? `${src.protocol?.toUpperCase()} ${src.host}:${src.port}` : src.description || '—'}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 min-w-[80px]">
                      <div className="text-xs font-mono text-blue-400">{(src.events_today || 0).toLocaleString()}</div>
                      <div className="text-xs text-gray-600">events/day</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => testConnection(src.id)}
                        disabled={tr === 'testing'}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${
                          tr === 'ok' ? 'bg-green-900/30 text-green-400 border-green-700' :
                          tr === 'fail' ? 'bg-red-900/30 text-red-400 border-red-700' :
                          tr === 'testing' ? 'bg-gray-800 text-gray-500 border-gray-700' :
                          'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
                        }`}
                      >
                        {tr === 'testing' ? 'Testing...' : tr === 'ok' ? 'OK' : tr === 'fail' ? 'Failed' : 'Test'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {!loading && filtered.length === 0 && (
                <div className="p-8 text-center text-gray-600 text-sm">No data sources found.</div>
              )}
            </div>
          </Panel>
        </div>

        {/* Source Detail */}
        <div>
          {selected ? (
            <Panel title="Source Detail" actions={
              <div className="flex gap-1">
                <button onClick={() => toggleStatus(selected.id, selected.status)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${selected.status === 'active' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800 hover:border-yellow-600' : 'bg-green-900/30 text-green-400 border-green-800'}`}>
                  {selected.status === 'active' ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => deleteSource(selected.id)} className="px-2 py-1 rounded text-xs border text-red-400 hover:border-red-700 transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <Trash2 size={11} />
                </button>
              </div>
            }>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 mb-3">
                  {integrationIcon(selected.integration)}
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.description || '—'}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    ['Integration', selected.integration],
                    ['Source Type', selected.source_type],
                    ['Status', selected.status],
                    ['Protocol', selected.protocol?.toUpperCase()],
                    ['Host', selected.host || '—'],
                    ['Port', selected.port ? String(selected.port) : '—'],
                    ['TLS', selected.tls_enabled ? 'Enabled' : 'Disabled'],
                    ['Auth Method', selected.auth_method],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center pb-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span className="text-gray-300 font-mono text-right">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded border p-3 space-y-1.5 mt-2" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                  <div className="uppercase tracking-wide text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Ingestion Stats</div>
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Events Today</span><span className="text-blue-400 font-mono font-bold">{(selected.events_today || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Total Events</span><span className="text-gray-300 font-mono">{(selected.events_total || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Last Event</span><span style={{ color: 'var(--text-secondary)' }}>{selected.last_event ? timeAgo(selected.last_event) : '—'}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Last Heartbeat</span><span style={{ color: 'var(--text-secondary)' }}>{selected.last_heartbeat ? timeAgo(selected.last_heartbeat) : '—'}</span></div>
                </div>

                {selected.tags && selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selected.tags.map((t, i) => (
                      <span key={i} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{t}</span>
                    ))}
                  </div>
                )}

                <div className="pt-1">
                  <div className="text-xs text-gray-600">Added: {formatDate(selected.created_at)}</div>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel title="Source Detail">
              <div className="p-8 text-center text-gray-600 text-sm">
                <Server size={28} className="mx-auto mb-2 text-gray-700" />
                Select a data source to view details.
              </div>
            </Panel>
          )}

          {/* Integration Quick Guide */}
          <div className="mt-4 border rounded p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Supported Integrations</div>
            <div className="space-y-1.5">
              {[
                { name: 'Wazuh', desc: 'Agent-based XDR/SIEM', color: 'text-blue-400' },
                { name: 'Elastic Beats', desc: 'Filebeat, Metricbeat, Winlogbeat', color: 'text-orange-400' },
                { name: 'Syslog', desc: 'RFC 5424 / UDP / TCP / TLS', color: 'text-green-400' },
                { name: 'Fluentd', desc: 'Container & K8s log routing', color: 'text-red-400' },
                { name: 'AWS CloudTrail', desc: 'Cloud API audit logs', color: 'text-yellow-400' },
                { name: 'Azure Monitor', desc: 'Azure AD & Activity Logs', color: 'text-blue-400' },
                { name: 'Zeek', desc: 'Network traffic analysis', color: 'text-green-400' },
                { name: 'SNMP Traps', desc: 'Network device traps', color: 'text-gray-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 ${item.color}`} />
                  <span className="text-gray-300 font-medium">{item.name}</span>
                  <span className="text-gray-600">— {item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Source Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Data Source" width="max-w-2xl">
        <div className="space-y-4">
          <Input label="Source Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Wazuh Manager — Production" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Integration Type</label>
              <Select value={form.integration} onChange={v => setForm(p => ({ ...p, integration: v }))} options={INTEGRATIONS} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Source Category</label>
              <Select value={form.source_type} onChange={v => setForm(p => ({ ...p, source_type: v }))} options={INTEGRATION_SOURCE_TYPES} />
            </div>
          </div>
          <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="What does this source collect?" />

          {/* Connection Config */}
          <div className="border rounded p-3 space-y-3" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Connection Configuration</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input label="Host / Endpoint" value={form.host} onChange={e => setForm(p => ({ ...p, host: e.target.value }))} placeholder="10.0.1.5 or api.example.com" />
              </div>
              <Input label="Port" value={form.port} onChange={e => setForm(p => ({ ...p, port: e.target.value }))} placeholder="514" type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Protocol</label>
                <Select value={form.protocol} onChange={v => setForm(p => ({ ...p, protocol: v }))} options={[
                  { value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' },
                  { value: 'http', label: 'HTTP' }, { value: 'https', label: 'HTTPS' },
                  { value: 'tls', label: 'TLS (Encrypted Syslog)' },
                ]} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Auth Method</label>
                <Select value={form.auth_method} onChange={v => setForm(p => ({ ...p, auth_method: v }))} options={[
                  { value: 'none', label: 'None' }, { value: 'api_key', label: 'API Key' },
                  { value: 'token', label: 'Bearer Token' }, { value: 'basic', label: 'Basic Auth' },
                  { value: 'certificate', label: 'TLS Certificate' },
                ]} />
              </div>
            </div>
            {(form.auth_method === 'api_key' || form.auth_method === 'token') && (
              <Input label="API Key / Token" value={form.api_key} onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))} placeholder="Enter API key or token" />
            )}
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.tls_enabled} onChange={e => setForm(p => ({ ...p, tls_enabled: e.target.checked }))} className="accent-blue-500" />
              Enable TLS / SSL encryption
            </label>
          </div>

          {/* Wazuh-specific help */}
          {form.integration === 'wazuh' && (
            <div className="bg-blue-900/20 border border-blue-800 rounded p-3 text-xs text-blue-300 space-y-1">
              <div className="font-semibold text-blue-200">Wazuh Integration Notes</div>
              <div>Default manager port: <span className="font-mono">1514/tcp</span> (agent communication), <span className="font-mono">1515/tcp</span> (enrollment)</div>
              <div>API port: <span className="font-mono">55000/tcp</span> — used for agent management queries.</div>
              <div>Agents auto-register via enrollment key and send events to this manager address.</div>
            </div>
          )}
          {form.integration === 'syslog' && (
            <div className="bg-green-900/20 border border-green-800 rounded p-3 text-xs text-green-300 space-y-1">
              <div className="font-semibold text-green-200">Syslog Integration Notes</div>
              <div>Standard ports: <span className="font-mono">514/udp</span> (plaintext), <span className="font-mono">601/tcp</span> (reliable), <span className="font-mono">6514/tcp</span> (TLS)</div>
              <div>Configure devices to forward logs to the SentinelX syslog receiver address.</div>
            </div>
          )}
          {form.integration === 'filebeat' && (
            <div className="bg-orange-900/20 border border-orange-800 rounded p-3 text-xs text-orange-300 space-y-1">
              <div className="font-semibold text-orange-200">Filebeat Integration Notes</div>
              <div>Logstash input port: <span className="font-mono">5044/tcp</span>. Configure <code>output.logstash</code> in filebeat.yml to point here.</div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addSource} disabled={saving || !form.name}>{saving ? 'Adding...' : 'Add Data Source'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ────────────────────────────────────────────────── Agent Manager ── */
function AgentManager() {
  const [agents, setAgents] = useState<SiemAgent[]>([]);
  const [sources, setSources] = useState<SiemSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<SiemAgent | null>(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ name: '', hostname: '', ip_address: '', os_platform: 'windows', os_name: '', os_version: '', agent_version: '4.7.3', groups: '' });
  const [enrolling, setEnrolling] = useState(false);
  const [enrollKey, setEnrollKey] = useState(() => generateEnrollmentKey());
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    fetchAgents();
    supabase.from('siem_sources').select('id, name, integration').then(r => setSources(r.data || []));
  }, [statusFilter]);

  async function fetchAgents() {
    setLoading(true);
    let q = supabase.from('siem_agents').select('*').order('last_heartbeat', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data } = await q;
    const now = Date.now();
    setAgents((data || []).map(agent => {
      if (agent.status === 'active' && agent.last_heartbeat) {
        const lastHeartbeat = new Date(agent.last_heartbeat).getTime();
        if (Number.isFinite(lastHeartbeat) && now - lastHeartbeat > 5 * 60 * 1000) {
          return { ...agent, status: 'disconnected' };
        }
      }
      return agent;
    }));
    setLoading(false);
  }

  const filtered = agents.filter(a =>
    !search ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.hostname || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.ip_address || '').includes(search) ||
    (a.agent_id || '').includes(search)
  );

  function generateEnrollmentKey() {
    return 'SX-' + Math.random().toString(36).slice(2, 10).toUpperCase() + '-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  function openEnrollModal() {
    setEnrollKey(generateEnrollmentKey());
    setEnrollError(null);
    setShowEnroll(true);
  }

  function nextAgentId() {
    const existing = agents
      .map(a => Number.parseInt(a.agent_id, 10))
      .filter(n => Number.isFinite(n));
    return String((existing.length ? Math.max(...existing) : 0) + 1).padStart(3, '0');
  }

  function generateWindowsAgentScript(agentId: string, key: string) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const agentName = enrollForm.name || enrollForm.hostname;
    const groups = enrollForm.groups
      ? enrollForm.groups.split(',').map(s => s.trim()).filter(Boolean)
      : ['windows'];

    return `# SentinelX Windows Agent Installer
# Run in an elevated PowerShell window on the laptop you want to enroll.
$ErrorActionPreference = "Stop"

$SupabaseUrl = "${supabaseUrl}"
$SupabaseAnonKey = "${supabaseAnonKey}"
$EnrollmentKey = "${key}"
$AgentId = "${agentId}"
$AgentName = "${agentName.replace(/"/g, '`"')}"
$Groups = @(${groups.map(g => `"${g.replace(/"/g, '`"')}"`).join(', ')})
$InstallDir = "$env:ProgramData\\SentinelX"
$AgentScript = Join-Path $InstallDir "sentinelx-agent.ps1"
$StateFile = Join-Path $InstallDir "state.json"
$TaskName = "SentinelX Agent"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$agent = @'
$ErrorActionPreference = "SilentlyContinue"
$SupabaseUrl = "__SUPABASE_URL__"
$SupabaseAnonKey = "__SUPABASE_KEY__"
$EnrollmentKey = "__ENROLLMENT_KEY__"
$AgentId = "__AGENT_ID__"
$AgentName = "__AGENT_NAME__"
$Groups = @(__GROUPS__)
$StateFile = "$env:ProgramData\\SentinelX\\state.json"
$Headers = @{
  "apikey" = $SupabaseAnonKey
  "Authorization" = "Bearer $SupabaseAnonKey"
  "Content-Type" = "application/json"
  "Prefer" = "return=minimal"
}

function ConvertTo-IsoUtc([datetime]$Value) {
  return $Value.ToUniversalTime().ToString("o")
}

function Get-PrimaryIp {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if (-not $ip) { $ip = "" }
  return $ip
}

function Invoke-SxRest($Method, $Path, $Body = $null) {
  $uri = "$SupabaseUrl/rest/v1/$Path"
  if ($Body -ne $null) {
    Invoke-RestMethod -Method $Method -Uri $uri -Headers $Headers -Body ($Body | ConvertTo-Json -Depth 8 -Compress) | Out-Null
  } else {
    Invoke-RestMethod -Method $Method -Uri $uri -Headers $Headers | Out-Null
  }
}

function Save-State($State) {
  $State | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -Path $StateFile
}

function Load-State {
  if (Test-Path $StateFile) {
    return Get-Content $StateFile -Raw | ConvertFrom-Json
  }
  return [pscustomobject]@{ last_event_time = (Get-Date).AddMinutes(-15).ToUniversalTime().ToString("o") }
}

$hostname = $env:COMPUTERNAME
$os = Get-CimInstance Win32_OperatingSystem
$ip = Get-PrimaryIp
$now = (Get-Date).ToUniversalTime().ToString("o")

$agentPatch = @{
  name = $AgentName
  hostname = $hostname
  ip_address = $ip
  os_name = $os.Caption
  os_version = $os.Version
  os_platform = "windows"
  agent_version = "sentinelx-powershell-1.0"
  status = "active"
  groups = $Groups
  last_heartbeat = $now
  updated_at = $now
}

Invoke-SxRest "PATCH" "siem_agents?enrollment_key=eq.$EnrollmentKey" $agentPatch

$state = Load-State
$lastTime = [datetime]$state.last_event_time
$newestTime = $lastTime
$eventsSent = 0

$logs = @("Security", "System", "Application")
foreach ($logName in $logs) {
  $events = Get-WinEvent -FilterHashtable @{ LogName = $logName; StartTime = $lastTime } -MaxEvents 60 -ErrorAction SilentlyContinue |
    Sort-Object TimeCreated

  foreach ($event in $events) {
    if ($event.TimeCreated -le $lastTime) { continue }
    if ($event.TimeCreated -gt $newestTime) { $newestTime = $event.TimeCreated }

    $severity = "info"
    if ($event.LevelDisplayName -eq "Error") { $severity = "high" }
    elseif ($event.LevelDisplayName -eq "Warning") { $severity = "medium" }
    elseif ($logName -eq "Security" -and $event.Id -in 4625,4720,4726,4732,4738,4740,1102) { $severity = "high" }

    $body = @{
      event_type = "$logName/$($event.Id)"
      source_type = "windows-agent"
      hostname = $hostname
      source_ip = $ip
      raw_log = $event.Message
      parsed_fields = @{
        agent_id = $AgentId
        enrollment_key = $EnrollmentKey
        log_name = $logName
        provider = $event.ProviderName
        event_id = $event.Id
        level = $event.LevelDisplayName
        record_id = $event.RecordId
      }
      severity = $severity
      created_at = (ConvertTo-IsoUtc $event.TimeCreated)
    }
    Invoke-SxRest "POST" "siem_events" $body
    $eventsSent++
  }
}

if ($eventsSent -gt 0) {
  $countPatch = @{
    events_today = $eventsSent
    events_total = $eventsSent
    last_event = $now
    last_heartbeat = $now
    status = "active"
    updated_at = $now
  }
  Invoke-SxRest "PATCH" "siem_agents?enrollment_key=eq.$EnrollmentKey" $countPatch
}

Save-State ([pscustomobject]@{ last_event_time = $newestTime.ToUniversalTime().ToString("o") })
'@

$agent = $agent.Replace("__SUPABASE_URL__", $SupabaseUrl)
$agent = $agent.Replace("__SUPABASE_KEY__", $SupabaseAnonKey)
$agent = $agent.Replace("__ENROLLMENT_KEY__", $EnrollmentKey)
$agent = $agent.Replace("__AGENT_ID__", $AgentId)
$agent = $agent.Replace("__AGENT_NAME__", $AgentName)
$agent = $agent.Replace("__GROUPS__", (($Groups | ForEach-Object { '"' + ($_ -replace '"','\\"') + '"' }) -join ", "))

Set-Content -Path $AgentScript -Value $agent -Encoding UTF8

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File \`"$AgentScript\`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$AgentScript"
Write-Host "SentinelX agent installed and enrolled as $AgentId ($AgentName)."
Write-Host "It will send heartbeats and Windows events every minute."
`;
  }

  function downloadTextFile(filename: string, contents: string) {
    const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function enrollAgent() {
    setEnrolling(true);
    setEnrollError(null);
    const nextId = nextAgentId();
    const wazuhSrc = sources.find(s => s.integration === 'wazuh');
    const { error } = await supabase.from('siem_agents').insert([{
      agent_id: nextId,
      name: enrollForm.name || enrollForm.hostname,
      source_id: wazuhSrc?.id || null,
      hostname: enrollForm.hostname || null,
      ip_address: enrollForm.ip_address || null,
      os_name: enrollForm.os_name || null,
      os_version: enrollForm.os_version || null,
      os_platform: enrollForm.os_platform,
      agent_version: enrollForm.agent_version,
      status: 'pending',
      enrollment_key: enrollKey,
      groups: enrollForm.groups ? enrollForm.groups.split(',').map(s => s.trim()) : [],
      events_today: 0,
      events_total: 0,
    }]);
    if (error) {
      setEnrollError(error.message);
      setEnrolling(false);
      return;
    }
    downloadTextFile(`sentinelx-agent-${nextId}.ps1`, generateWindowsAgentScript(nextId, enrollKey));
    setEnrolling(false);
    setShowEnroll(false);
    setEnrollForm({ name: '', hostname: '', ip_address: '', os_platform: 'windows', os_name: '', os_version: '', agent_version: '4.7.3', groups: '' });
    setEnrollKey(generateEnrollmentKey());
    fetchAgents();
  }

  async function removeAgent(id: string) {
    await supabase.from('siem_agents').delete().eq('id', id);
    setSelected(null);
    fetchAgents();
  }

  async function restartAgent(id: string) {
    await supabase.from('siem_agents').update({ status: 'active', last_heartbeat: new Date().toISOString() }).eq('id', id);
    fetchAgents();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: 'active', last_heartbeat: new Date().toISOString() } : null);
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  const activeCount = agents.filter(a => a.status === 'active').length;
  const disconnectedCount = agents.filter(a => a.status === 'disconnected').length;
  const outdatedCount = agents.filter(a => a.status === 'outdated').length;
  const pendingCount = agents.filter(a => a.status === 'pending').length;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-4 gap-3">
        <div className="border rounded p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}><div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Agents</div><div className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{agents.length}</div></div>
        <div className="border border-green-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}><div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Active</div><div className="text-2xl font-bold font-mono text-green-400">{activeCount}</div></div>
        <div className="border border-red-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}><div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Disconnected</div><div className="text-2xl font-bold font-mono text-red-400">{disconnectedCount}</div></div>
        <div className="border border-yellow-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}><div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Outdated / Pending</div><div className="text-2xl font-bold font-mono text-yellow-400">{outdatedCount + pendingCount}</div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Agent Table */}
        <div className="xl:col-span-2">
          <Panel title="Enrolled Agents" actions={
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search agents..." className="w-48" />
              <Select value={statusFilter} onChange={setStatusFilter} options={[
                { value: '', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'disconnected', label: 'Disconnected' },
                { value: 'outdated', label: 'Outdated' },
                { value: 'pending', label: 'Pending' },
              ]} />
              <Button onClick={openEnrollModal}><PlusCircle size={13} /> Enroll Agent</Button>
            </div>
          }>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['ID', 'Name', 'OS', 'IP Address', 'Version', 'Status', 'Last Heartbeat', 'Events/Day', ''].map(col => (
                      <th key={col} className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j} className="py-2 px-3"><div className="h-4 bg-gray-700 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.map(agent => (
                    <tr key={agent.id}
                      className={`cursor-pointer hover:bg-gray-700/20 ${selected?.id === agent.id ? 'bg-blue-900/10' : ''}`}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onClick={() => setSelected(agent)}>
                      <td className="py-2 px-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{agent.agent_id}</td>
                      <td className="py-2 px-3">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{agent.name}</div>
                        {agent.hostname && agent.hostname !== agent.name && (
                          <div className="text-xs text-gray-600 font-mono">{agent.hostname}</div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          {osPlatformIcon(agent.os_platform || '')}
                          <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--text-secondary)' }}>{agent.os_name} {agent.os_version}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{agent.ip_address || '—'}</td>
                      <td className="py-2 px-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{agent.agent_version || '—'}</td>
                      <td className="py-2 px-3">{agentStatusDot(agent.status)}</td>
                      <td className="py-2 px-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {agent.last_heartbeat ? timeAgo(agent.last_heartbeat) : '—'}
                      </td>
                      <td className="py-2 px-3 text-xs font-mono text-blue-400">{(agent.events_today || 0).toLocaleString()}</td>
                      <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                        {agent.status === 'disconnected' || agent.status === 'outdated' ? (
                          <button onClick={() => restartAgent(agent.id)} className="text-xs text-green-400 hover:text-green-300 border border-green-800 rounded px-2 py-0.5">Reconnect</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={9} className="py-8 text-center text-gray-600 text-sm">No agents found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>{filtered.length} agents</div>
          </Panel>
        </div>

        {/* Agent Detail */}
        <div>
          {selected ? (
            <Panel title={`Agent: ${selected.agent_id}`} actions={
              <button onClick={() => removeAgent(selected.id)} className="p-1 rounded text-red-500 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                <Trash2 size={13} />
              </button>
            }>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  {osPlatformIcon(selected.os_platform || '')}
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.name}</div>
                    <div>{agentStatusDot(selected.status)}</div>
                  </div>
                </div>

                {[
                  ['Agent ID', selected.agent_id],
                  ['Hostname', selected.hostname || '—'],
                  ['IP Address', selected.ip_address || '—'],
                  ['OS', `${selected.os_name || ''} ${selected.os_version || ''}`],
                  ['Platform', selected.os_platform || '—'],
                  ['Agent Version', selected.agent_version || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center pb-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span className="text-gray-300 font-mono text-right">{value}</span>
                  </div>
                ))}

                <div className="rounded border p-3 space-y-1.5" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                  <div className="uppercase tracking-wide text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Activity</div>
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Events Today</span><span className="text-blue-400 font-mono font-bold">{(selected.events_today || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Total Events</span><span className="text-gray-300 font-mono">{(selected.events_total || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Last Heartbeat</span><span style={{ color: 'var(--text-secondary)' }}>{selected.last_heartbeat ? timeAgo(selected.last_heartbeat) : '—'}</span></div>
                </div>

                {selected.groups && selected.groups.length > 0 && (
                  <div>
                    <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Groups</div>
                    <div className="flex flex-wrap gap-1">
                      {selected.groups.map((g, i) => (
                        <span key={i} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5" style={{ color: 'var(--text-secondary)' }}>{g}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.enrollment_key && (
                  <div>
                    <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Enrollment Key</div>
                    <div className="flex items-center gap-1 rounded border px-2 py-1.5" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                      <code className="text-green-400 font-mono text-xs flex-1 truncate">{selected.enrollment_key}</code>
                      <button onClick={() => copyKey(selected.enrollment_key!)} style={{ color: 'var(--text-muted)' }} className="hover:text-gray-300">
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-gray-600">Enrolled: {formatDate(selected.created_at)}</div>
              </div>
            </Panel>
          ) : (
            <Panel title="Agent Detail">
              <div className="p-8 text-center text-gray-600 text-sm">
                <Cpu size={28} className="mx-auto mb-2 text-gray-700" />
                Select an agent to view details.
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* Enroll Agent Modal */}
      <Modal open={showEnroll} onClose={() => setShowEnroll(false)} title="Enroll New Agent" width="max-w-2xl">
        <div className="space-y-4">
          <div className="rounded p-3 text-sm space-y-2" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Windows laptop enrollment</div>
            <div className="flex items-center gap-2">
              <code className="font-mono text-green-400 px-2 py-1 rounded border flex-1" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>{enrollKey}</code>
              <button onClick={() => copyKey(enrollKey)} className={`px-2 py-1 rounded text-xs border transition-colors ${copiedKey ? 'bg-green-900/30 text-green-400 border-green-700' : 'text-gray-400 hover:border-gray-500'}`} style={copiedKey ? undefined : { borderColor: 'var(--border)' }}>
                {copiedKey ? 'Copied!' : <Copy size={11} />}
              </button>
            </div>
            <div>Click Enroll Agent to download the installer. Run it as Administrator on your sister's or brother's Windows laptop. The agent registers this key, sends a heartbeat every minute, and forwards recent Windows events.</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Agent Name" value={enrollForm.name} onChange={e => setEnrollForm(p => ({ ...p, name: e.target.value }))} placeholder="server-01" />
            <Input label="Hostname" value={enrollForm.hostname} onChange={e => setEnrollForm(p => ({ ...p, hostname: e.target.value }))} placeholder="server-01.corp.local" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="IP Address" value={enrollForm.ip_address} onChange={e => setEnrollForm(p => ({ ...p, ip_address: e.target.value }))} placeholder="10.0.0.1" />
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>OS Platform</label>
              <Select value={enrollForm.os_platform} onChange={v => setEnrollForm(p => ({ ...p, os_platform: v }))} options={[
                { value: 'windows', label: 'Windows' }, { value: 'ubuntu', label: 'Ubuntu' },
                { value: 'rhel', label: 'RHEL / CentOS' }, { value: 'debian', label: 'Debian' },
                { value: 'darwin', label: 'macOS' }, { value: 'panos', label: 'PAN-OS' },
              ]} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="OS Name" value={enrollForm.os_name} onChange={e => setEnrollForm(p => ({ ...p, os_name: e.target.value }))} placeholder="Windows 11" />
            <Input label="OS Version" value={enrollForm.os_version} onChange={e => setEnrollForm(p => ({ ...p, os_version: e.target.value }))} placeholder="10.0.22621" />
          </div>
          <Input label="Groups (comma-separated)" value={enrollForm.groups} onChange={e => setEnrollForm(p => ({ ...p, groups: e.target.value }))} placeholder="windows, workstations, production" />

          {enrollError && (
            <div className="rounded border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
              {enrollError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEnroll(false)}>Cancel</Button>
            <Button onClick={enrollAgent} disabled={enrolling || !enrollForm.hostname}>
              <Download size={14} />
              {enrolling ? 'Creating...' : 'Create & Download Agent'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
