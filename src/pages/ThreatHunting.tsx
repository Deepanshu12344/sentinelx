import React, { useState } from 'react';
import { Search, Crosshair, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Panel, SearchInput, Select, Badge, Button, Table, Modal, Input } from '../components/ui';
import { formatDate } from '../lib/utils';

const HUNT_TYPES = [
  { value: 'ip', label: 'IP Address' },
  { value: 'domain', label: 'Domain' },
  { value: 'hash', label: 'File Hash' },
  { value: 'process', label: 'Process Name' },
  { value: 'host', label: 'Hostname' },
  { value: 'user', label: 'Username' },
];

interface HuntResult {
  type: string;
  query: string;
  siem_hits: any[];
  threat_intel_hits: any[];
  alert_hits: any[];
}

export default function ThreatHunting() {
  const [huntType, setHuntType] = useState('ip');
  const [huntQuery, setHuntQuery] = useState('');
  const [hunting, setHunting] = useState(false);
  const [results, setResults] = useState<HuntResult | null>(null);
  const [yaraRule, setYaraRule] = useState('');
  const [sigmaRule, setSigmaRule] = useState('');
  const [activeTab, setActiveTab] = useState<'ioc' | 'yara' | 'sigma' | 'behavior'>('ioc');

  async function hunt() {
    if (!huntQuery.trim()) return;
    setHunting(true);
    setResults(null);

    try {
      let siemQ = supabase.from('siem_events').select('*').order('created_at', { ascending: false }).limit(50);
      let tiQ = supabase.from('threat_intel').select('*').eq('active', true);
      let alertQ = supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(50);

      const q = huntQuery.toLowerCase();

      if (huntType === 'ip') {
        siemQ = siemQ.or(`source_ip.ilike.%${q}%,destination_ip.ilike.%${q}%`);
        tiQ = tiQ.eq('indicator_type', 'ip').ilike('indicator_value', `%${q}%`);
        alertQ = alertQ.or(`source_ip.ilike.%${q}%,destination_ip.ilike.%${q}%`);
      } else if (huntType === 'domain') {
        siemQ = siemQ.ilike('raw_log', `%${q}%`);
        tiQ = tiQ.eq('indicator_type', 'domain').ilike('indicator_value', `%${q}%`);
        alertQ = alertQ.ilike('description', `%${q}%`);
      } else if (huntType === 'hash') {
        siemQ = siemQ.ilike('raw_log', `%${q}%`);
        tiQ = tiQ.eq('indicator_type', 'hash').ilike('indicator_value', `%${q}%`);
        alertQ = alertQ.ilike('description', `%${q}%`);
      } else if (huntType === 'process') {
        siemQ = siemQ.ilike('process_name', `%${q}%`);
        tiQ = tiQ.ilike('description', `%${q}%`);
        alertQ = alertQ.ilike('description', `%${q}%`);
      } else if (huntType === 'host') {
        siemQ = siemQ.ilike('hostname', `%${q}%`);
        tiQ = tiQ.ilike('description', `%${q}%`);
        alertQ = alertQ.ilike('description', `%${q}%`);
      } else if (huntType === 'user') {
        siemQ = siemQ.ilike('user_name', `%${q}%`);
        tiQ = tiQ.ilike('description', `%${q}%`);
        alertQ = alertQ.ilike('description', `%${q}%`);
      }

      const [siemRes, tiRes, alertRes] = await Promise.all([siemQ, tiQ, alertQ]);

      setResults({
        type: huntType,
        query: huntQuery,
        siem_hits: siemRes.data || [],
        threat_intel_hits: tiRes.data || [],
        alert_hits: alertRes.data || [],
      });
    } finally {
      setHunting(false);
    }
  }

  const tabs = [
    { id: 'ioc', label: 'IOC Search' },
    { id: 'yara', label: 'YARA Rules' },
    { id: 'sigma', label: 'Sigma Rules' },
    { id: 'behavior', label: 'Behavior Analytics' },
  ] as const;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Tab Bar */}
      <div className="flex gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent hover:text-gray-300'
            }`}
            style={activeTab === t.id ? undefined : { color: 'var(--text-muted)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'ioc' && (
        <div className="space-y-4">
          <Panel title="IOC Hunt">
            <div className="p-4">
              <div className="flex gap-3 items-end">
                <div className="w-40">
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Hunt Type</label>
                  <Select value={huntType} onChange={setHuntType} options={HUNT_TYPES} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Search Query</label>
                  <input
                    value={huntQuery}
                    onChange={e => setHuntQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && hunt()}
                    placeholder={`Enter ${huntType} to hunt...`}
                    className="w-full border rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <Button onClick={hunt} disabled={hunting} size="md">
                  <Crosshair size={14} />
                  {hunting ? 'Hunting...' : 'Hunt'}
                </Button>
              </div>
            </div>
          </Panel>

          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className={`border rounded p-3 ${results.siem_hits.length ? 'border-yellow-700' : ''}`}
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: results.siem_hits.length ? undefined : 'var(--border)' }}>
                  <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>SIEM Hits</div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${results.siem_hits.length ? 'text-yellow-400' : ''}`}
                    style={results.siem_hits.length ? undefined : { color: 'var(--text-muted)' }}>{results.siem_hits.length}</div>
                </div>
                <div className={`border rounded p-3 ${results.threat_intel_hits.length ? 'border-red-700' : ''}`}
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: results.threat_intel_hits.length ? undefined : 'var(--border)' }}>
                  <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Threat Intel Hits</div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${results.threat_intel_hits.length ? 'text-red-400' : ''}`}
                    style={results.threat_intel_hits.length ? undefined : { color: 'var(--text-muted)' }}>{results.threat_intel_hits.length}</div>
                </div>
                <div className={`border rounded p-3 ${results.alert_hits.length ? 'border-orange-700' : ''}`}
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: results.alert_hits.length ? undefined : 'var(--border)' }}>
                  <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Alert Hits</div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${results.alert_hits.length ? 'text-orange-400' : ''}`}
                    style={results.alert_hits.length ? undefined : { color: 'var(--text-muted)' }}>{results.alert_hits.length}</div>
                </div>
              </div>

              {results.threat_intel_hits.length > 0 && (
                <Panel title="Threat Intelligence Matches">
                  <Table
                    columns={[
                      { key: 'type', label: 'Type' },
                      { key: 'value', label: 'Indicator' },
                      { key: 'score', label: 'Score' },
                      { key: 'actor', label: 'Threat Actor' },
                      { key: 'family', label: 'Malware Family' },
                      { key: 'source', label: 'Source' },
                    ]}
                    rows={results.threat_intel_hits.map(t => ({
                      type: <span className="text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>{t.indicator_type}</span>,
                      value: <span className="text-xs font-mono text-red-300">{t.indicator_value}</span>,
                      score: <span className={`text-xs font-bold font-mono ${t.threat_score >= 80 ? 'text-red-400' : 'text-yellow-400'}`}>{t.threat_score}/100</span>,
                      actor: <span className="text-xs text-orange-400">{t.threat_actor || '-'}</span>,
                      family: <span className="text-xs text-yellow-400">{t.malware_family || '-'}</span>,
                      source: <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.source || '-'}</span>,
                    }))}
                  />
                </Panel>
              )}

              {results.siem_hits.length > 0 && (
                <Panel title="SIEM Event Matches">
                  <Table
                    columns={[
                      { key: 'time', label: 'Timestamp' },
                      { key: 'sev', label: 'Severity' },
                      { key: 'host', label: 'Host' },
                      { key: 'type', label: 'Event' },
                      { key: 'src', label: 'Source IP' },
                      { key: 'user', label: 'User' },
                    ]}
                    rows={results.siem_hits.map(e => ({
                      time: <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{formatDate(e.created_at)}</span>,
                      sev: <Badge text={e.severity} type="severity" />,
                      host: <span className="text-xs font-mono text-gray-300">{e.hostname || '-'}</span>,
                      type: <span className="text-xs text-gray-300">{e.event_type}</span>,
                      src: <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{e.source_ip || '-'}</span>,
                      user: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{e.user_name || '-'}</span>,
                    }))}
                  />
                </Panel>
              )}

              {results.siem_hits.length === 0 && results.threat_intel_hits.length === 0 && results.alert_hits.length === 0 && (
                <div className="border rounded p-8 text-center text-sm" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  No hits found for "{results.query}" in SIEM events, threat intel, or alerts.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'yara' && (
        <Panel title="YARA Rule Scanner">
          <div className="p-4 space-y-3">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Write or paste a YARA rule to scan against collected malware samples.</div>
            <textarea
              value={yaraRule}
              onChange={e => setYaraRule(e.target.value)}
              rows={12}
              placeholder={`rule SuspiciousExecutable {\n    meta:\n        author = "SOC Analyst"\n        description = "Detects suspicious PE files"\n    strings:\n        $s1 = "cmd.exe" nocase\n        $s2 = "powershell" nocase\n        $s3 = "CreateRemoteThread"\n    condition:\n        uint16(0) == 0x5A4D and 2 of them\n}`}
              className="w-full border rounded px-3 py-2 text-xs text-green-400 font-mono focus:outline-none focus:border-blue-500 resize-none"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2">
              <Button><Search size={13} /> Run Scan</Button>
              <Button variant="secondary">Load Rule Library</Button>
            </div>
            <div className="text-xs border rounded p-3" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
              YARA scanning runs against the malware samples database. Results will show matching samples with extraction details.
            </div>
          </div>
        </Panel>
      )}

      {activeTab === 'sigma' && (
        <Panel title="Sigma Rule Engine">
          <div className="p-4 space-y-3">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Define Sigma detection rules to search SIEM event logs.</div>
            <textarea
              value={sigmaRule}
              onChange={e => setSigmaRule(e.target.value)}
              rows={12}
              placeholder={`title: Mimikatz Execution\nstatus: experimental\ndescription: Detects Mimikatz credential dumping tool\nlogsource:\n    category: process_creation\n    product: windows\ndetection:\n    selection:\n        Image|endswith:\n            - '\\mimikatz.exe'\n            - '\\mimilib.dll'\n        CommandLine|contains:\n            - 'sekurlsa::'\n            - 'kerberos::'\n            - 'lsadump::'\n    condition: selection\nlevel: critical`}
              className="w-full border rounded px-3 py-2 text-xs text-blue-300 font-mono focus:outline-none focus:border-blue-500 resize-none"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2">
              <Button><Search size={13} /> Execute Rule</Button>
              <Button variant="secondary">Import Sigma Pack</Button>
            </div>
          </div>
        </Panel>
      )}

      {activeTab === 'behavior' && (
        <BehaviorAnalytics />
      )}
    </div>
  );
}

function BehaviorAnalytics() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function fetch() {
      const { data: events } = await supabase
        .from('siem_events')
        .select('user_name, hostname, event_type, severity, created_at')
        .not('user_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);

      // Aggregate by user
      const userMap: Record<string, { events: number; hosts: Set<string>; criticals: number }> = {};
      (events || []).forEach(e => {
        if (!e.user_name) return;
        if (!userMap[e.user_name]) userMap[e.user_name] = { events: 0, hosts: new Set(), criticals: 0 };
        userMap[e.user_name].events++;
        if (e.hostname) userMap[e.user_name].hosts.add(e.hostname);
        if (e.severity === 'critical' || e.severity === 'high') userMap[e.user_name].criticals++;
      });

      setData(
        Object.entries(userMap)
          .map(([user, stats]) => ({
            user,
            events: stats.events,
            hosts: stats.hosts.size,
            criticals: stats.criticals,
            risk: stats.criticals > 2 ? 'high' : stats.criticals > 0 ? 'medium' : 'low',
          }))
          .sort((a, b) => b.criticals - a.criticals)
      );
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <Panel title="User Behavior Analytics (UBA)">
      <Table
        columns={[
          { key: 'user', label: 'Username' },
          { key: 'events', label: 'Total Events' },
          { key: 'hosts', label: 'Unique Hosts' },
          { key: 'criticals', label: 'High/Critical Events' },
          { key: 'risk', label: 'Risk Level' },
        ]}
        loading={loading}
        rows={data.map(d => ({
          user: <span className="text-sm font-mono text-gray-300">{d.user}</span>,
          events: <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{d.events}</span>,
          hosts: <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{d.hosts}</span>,
          criticals: <span className={`text-sm font-mono font-bold ${d.criticals > 2 ? 'text-red-400' : d.criticals > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>{d.criticals}</span>,
          risk: <Badge text={d.risk} type="severity" />,
        }))}
      />
    </Panel>
  );
}
