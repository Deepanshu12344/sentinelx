import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Key, Save } from 'lucide-react';
import { supabase, CorrelationRule, AuditLog } from '../lib/supabase';
import { Panel, Button, Table, Modal, Input, Textarea, Select, Badge } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'rules' | 'integrations' | 'api' | 'audit'>('rules');
  const [rules, setRules] = useState<CorrelationRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'rules') fetchRules();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  async function fetchRules() {
    setLoading(true);
    const { data } = await supabase.from('correlation_rules').select('*').order('hit_count', { ascending: false });
    setRules(data || []);
    setLoading(false);
  }

  async function fetchAuditLogs() {
    setLoading(true);
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    setAuditLogs(data || []);
    setLoading(false);
  }

  async function toggleRule(id: string, enabled: boolean) {
    await supabase.from('correlation_rules').update({ enabled: !enabled }).eq('id', id);
    fetchRules();
  }

  const tabs = [
    { id: 'rules', label: 'SIEM/Correlation Rules' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'api', label: 'API Keys' },
    { id: 'audit', label: 'Audit Logs' },
  ] as const;

  const INTEGRATIONS = [
    { name: 'MISP', type: 'Threat Intelligence', status: 'configured', endpoint: 'https://misp.internal' },
    { name: 'AbuseIPDB', type: 'Reputation', status: 'configured', endpoint: 'https://api.abuseipdb.com' },
    { name: 'AlienVault OTX', type: 'Threat Intelligence', status: 'configured', endpoint: 'https://otx.alienvault.com' },
    { name: 'VirusTotal', type: 'Malware Analysis', status: 'configured', endpoint: 'https://www.virustotal.com' },
    { name: 'OpenCTI', type: 'Threat Intelligence', status: 'not_configured', endpoint: '' },
    { name: 'Shodan', type: 'OSINT', status: 'not_configured', endpoint: '' },
    { name: 'SMTP Gateway', type: 'Notifications', status: 'configured', endpoint: 'smtp://mail.internal:587' },
    { name: 'Slack', type: 'Notifications', status: 'configured', endpoint: 'https://hooks.slack.com/...' },
    { name: 'Microsoft Teams', type: 'Notifications', status: 'not_configured', endpoint: '' },
    { name: 'PagerDuty', type: 'Alerting', status: 'not_configured', endpoint: '' },
  ];

  const API_KEYS = [
    { name: 'SIEM Ingestion API', key: 'sx_live_***************************a8f2', created: '2024-01-01', last_used: '5 min ago', scopes: ['siem:write'] },
    { name: 'Dashboard Read API', key: 'sx_live_***************************c4d1', created: '2024-01-15', last_used: '1 hr ago', scopes: ['dashboard:read'] },
    { name: 'Threat Intel Feed', key: 'sx_live_***************************7e91', created: '2024-02-01', last_used: '2 days ago', scopes: ['threatintel:read', 'threatintel:write'] },
  ];

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${activeTab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'rules' && (
        <Panel title="Correlation & Detection Rules">
          <Table
            loading={loading}
            columns={[
              { key: 'name', label: 'Rule Name' },
              { key: 'type', label: 'Type', width: 'w-24' },
              { key: 'severity', label: 'Severity', width: 'w-24' },
              { key: 'mitre', label: 'MITRE', width: 'w-48' },
              { key: 'hits', label: 'Hits', width: 'w-16' },
              { key: 'last_hit', label: 'Last Hit', width: 'w-28' },
              { key: 'enabled', label: 'Enabled', width: 'w-20' },
            ]}
            rows={rules.map(r => ({
              name: <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</span>,
              type: <span className="text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>{r.rule_type}</span>,
              severity: <Badge text={r.severity} type="severity" />,
              mitre: r.mitre_technique ? (
                <span className="text-xs text-blue-400">{r.mitre_tactic} / {r.mitre_technique}</span>
              ) : <span className="text-gray-700">-</span>,
              hits: <span className="text-xs font-mono text-gray-300">{r.hit_count}</span>,
              last_hit: <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.last_hit ? timeAgo(r.last_hit) : 'Never'}</span>,
              enabled: (
                <button onClick={() => toggleRule(r.id, r.enabled)}
                  className={`text-xs font-medium transition-colors ${r.enabled ? 'text-green-400 hover:text-green-300' : 'text-gray-600 hover:text-gray-400'}`}>
                  {r.enabled ? 'Active' : 'Disabled'}
                </button>
              ),
            }))}
          />
        </Panel>
      )}

      {activeTab === 'integrations' && (
        <Panel title="Platform Integrations">
          <div className="divide-y">
            {INTEGRATIONS.map((int, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{int.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{int.type}{int.endpoint ? ` · ${int.endpoint}` : ''}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${int.status === 'configured' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-gray-800 text-gray-600 border-gray-700'}`}>
                    {int.status === 'configured' ? 'Connected' : 'Not Configured'}
                  </span>
                  <Button variant="ghost" size="xs">Configure</Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {activeTab === 'api' && (
        <Panel title="API Keys" actions={<Button><Plus size={13} /> Generate Key</Button>}>
          <div className="divide-y">
            {API_KEYS.map((key, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{key.name}</div>
                    <code className="text-xs font-mono px-2 py-0.5 rounded border mt-1 block w-fit"
                      style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>{key.key}</code>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="xs">Rotate</Button>
                    <Button variant="danger" size="xs"><Trash2 size={11} /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span>Created: {key.created}</span>
                  <span>·</span>
                  <span>Last used: {key.last_used}</span>
                  <span>·</span>
                  <span>Scopes: {key.scopes.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {activeTab === 'audit' && (
        <Panel title="Audit Logs">
          <Table
            loading={loading}
            columns={[
              { key: 'time', label: 'Timestamp', width: 'w-44' },
              { key: 'actor', label: 'Actor', width: 'w-36' },
              { key: 'action', label: 'Action' },
              { key: 'resource', label: 'Resource', width: 'w-36' },
              { key: 'ip', label: 'IP Address', width: 'w-32' },
            ]}
            rows={auditLogs.length > 0 ? auditLogs.map(log => ({
              time: <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{formatDate(log.created_at)}</span>,
              actor: <span className="text-xs text-gray-300">{log.actor || 'System'}</span>,
              action: <span className="text-xs text-gray-300">{log.action}</span>,
              resource: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{log.resource_type || '-'}</span>,
              ip: <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{log.ip_address || '-'}</span>,
            })) : [
              {
                time: <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{formatDate(new Date().toISOString())}</span>,
                actor: <span className="text-xs text-gray-300">alice.johnson</span>,
                action: <span className="text-xs text-gray-300">User login</span>,
                resource: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>auth</span>,
                ip: <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>10.0.3.101</span>,
              },
              {
                time: <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{formatDate(new Date(Date.now() - 3600000).toISOString())}</span>,
                actor: <span className="text-xs text-gray-300">bob.williams</span>,
                action: <span className="text-xs text-gray-300">Alert status updated</span>,
                resource: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>alert</span>,
                ip: <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>10.0.3.102</span>,
              },
            ]}
            emptyMessage="No audit logs recorded yet."
          />
        </Panel>
      )}
    </div>
  );
}
