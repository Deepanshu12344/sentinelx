import React, { useEffect, useState } from 'react';
import { Plus, Shield, Filter } from 'lucide-react';
import { supabase, ThreatIntel } from '../lib/supabase';
import { Panel, Badge, Button, Table, Modal, Input, Textarea, Select, SearchInput } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

const TYPES = [
  { value: '', label: 'All Types' },
  { value: 'ip', label: 'IP Address' },
  { value: 'domain', label: 'Domain' },
  { value: 'hash', label: 'File Hash' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
];

const SOURCES = [
  { value: '', label: 'All Sources' },
  { value: 'MISP', label: 'MISP' },
  { value: 'AbuseIPDB', label: 'AbuseIPDB' },
  { value: 'AlienVault OTX', label: 'AlienVault OTX' },
  { value: 'VirusTotal', label: 'VirusTotal' },
  { value: 'OpenCTI', label: 'OpenCTI' },
];

const THREAT_ACTORS = [
  'APT1', 'APT28 (Fancy Bear)', 'APT29 (Cozy Bear)', 'APT41', 'Wizard Spider',
  'Lazarus Group', 'Sandworm', 'FIN7', 'Carbanak', 'LockBit', 'Conti',
];

export default function ThreatIntelligence() {
  const [indicators, setIndicators] = useState<ThreatIntel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selected, setSelected] = useState<ThreatIntel | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ indicator_type: 'ip', indicator_value: '', threat_score: 50, confidence: 70, severity: 'medium', malware_family: '', threat_actor: '', description: '', source: 'Manual' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'indicators' | 'actors' | 'feeds'>('indicators');

  useEffect(() => { fetchIndicators(); }, [typeFilter, sourceFilter]);

  async function fetchIndicators() {
    setLoading(true);
    let q = supabase.from('threat_intel').select('*').order('threat_score', { ascending: false });
    if (typeFilter) q = q.eq('indicator_type', typeFilter);
    if (sourceFilter) q = q.eq('source', sourceFilter);
    const { data } = await q;
    setIndicators(data || []);
    setLoading(false);
  }

  const filtered = indicators.filter(i =>
    !search ||
    i.indicator_value.toLowerCase().includes(search.toLowerCase()) ||
    (i.malware_family || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.threat_actor || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(search.toLowerCase())
  );

  async function addIndicator() {
    setSaving(true);
    await supabase.from('threat_intel').insert([{
      ...form,
      tags: [],
      active: true,
    }]);
    setSaving(false);
    setShowAdd(false);
    setForm({ indicator_type: 'ip', indicator_value: '', threat_score: 50, confidence: 70, severity: 'medium', malware_family: '', threat_actor: '', description: '', source: 'Manual' });
    fetchIndicators();
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from('threat_intel').update({ active: !active }).eq('id', id);
    fetchIndicators();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, active: !active } : null);
  }

  const FEED_SOURCES = [
    { name: 'MISP', type: 'STIX/TAXII', status: 'active', indicators: indicators.filter(i => i.source === 'MISP').length, lastSync: '5 min ago' },
    { name: 'AbuseIPDB', type: 'REST API', status: 'active', indicators: indicators.filter(i => i.source === 'AbuseIPDB').length, lastSync: '2 min ago' },
    { name: 'AlienVault OTX', type: 'REST API', status: 'active', indicators: indicators.filter(i => i.source === 'AlienVault OTX').length, lastSync: '8 min ago' },
    { name: 'VirusTotal', type: 'REST API', status: 'active', indicators: indicators.filter(i => i.source === 'VirusTotal').length, lastSync: '1 min ago' },
    { name: 'OpenCTI', type: 'GraphQL', status: 'active', indicators: indicators.filter(i => i.source === 'OpenCTI').length, lastSync: '12 min ago' },
  ];

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="border border-gray-700 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Indicators</div>
          <div className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{indicators.length}</div>
        </div>
        <div className="border border-red-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Critical</div>
          <div className="text-2xl font-bold font-mono text-red-400">{indicators.filter(i => i.severity === 'critical').length}</div>
        </div>
        <div className="border border-orange-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Threat Actors</div>
          <div className="text-2xl font-bold font-mono text-orange-400">{new Set(indicators.filter(i => i.threat_actor).map(i => i.threat_actor)).size}</div>
        </div>
        <div className="border border-yellow-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Active Feeds</div>
          <div className="text-2xl font-bold font-mono text-yellow-400">{FEED_SOURCES.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['indicators', 'actors', 'feeds'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent hover:text-gray-300'}`}
            style={activeTab === tab ? undefined : { color: 'var(--text-muted)' }}>
            {tab === 'indicators' ? 'IOC Repository' : tab === 'actors' ? 'Threat Actors' : 'Feed Sources'}
          </button>
        ))}
      </div>

      {activeTab === 'indicators' && (
        <Panel
          title="Threat Indicators"
          actions={
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search indicators..." className="w-56" />
              <Select value={typeFilter} onChange={setTypeFilter} options={TYPES} />
              <Select value={sourceFilter} onChange={setSourceFilter} options={SOURCES} />
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={13} /> Add IOC
              </Button>
            </div>
          }
        >
          <Table
            loading={loading}
            columns={[
              { key: 'type', label: 'Type', width: 'w-24' },
              { key: 'value', label: 'Indicator' },
              { key: 'score', label: 'Score', width: 'w-20' },
              { key: 'confidence', label: 'Confidence', width: 'w-24' },
              { key: 'severity', label: 'Severity', width: 'w-24' },
              { key: 'actor', label: 'Threat Actor', width: 'w-36' },
              { key: 'family', label: 'Malware', width: 'w-28' },
              { key: 'source', label: 'Source', width: 'w-28' },
              { key: 'active', label: 'Status', width: 'w-20' },
            ]}
            rows={filtered.map(ind => ({
              type: <span className="text-xs uppercase font-mono" style={{ color: 'var(--text-secondary)' }}>{ind.indicator_type}</span>,
              value: <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{ind.indicator_value}</span>,
              score: (
                <div className="flex items-center gap-1">
                  <div className="w-10 bg-gray-700 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${ind.threat_score >= 80 ? 'bg-red-500' : ind.threat_score >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${ind.threat_score}%` }} />
                  </div>
                  <span className={`text-xs font-mono font-bold ${ind.threat_score >= 80 ? 'text-red-400' : ind.threat_score >= 50 ? 'text-yellow-400' : 'text-green-400'}`}>{ind.threat_score}</span>
                </div>
              ),
              confidence: <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{ind.confidence}%</span>,
              severity: <Badge text={ind.severity} type="severity" />,
              actor: <span className="text-xs text-orange-400">{ind.threat_actor || '-'}</span>,
              family: <span className="text-xs text-yellow-400">{ind.malware_family || '-'}</span>,
              source: <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ind.source || '-'}</span>,
              active: (
                <button onClick={e => { e.stopPropagation(); toggleActive(ind.id, ind.active); }}
                  className={`text-xs font-medium ${ind.active ? 'text-green-400' : 'text-gray-600'}`}>
                  {ind.active ? 'Active' : 'Inactive'}
                </button>
              ),
            }))}
            onRowClick={i => setSelected(filtered[i])}
          />
          <div className="px-4 py-2 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>{filtered.length} indicators</div>
        </Panel>
      )}

      {activeTab === 'actors' && (
        <Panel title="APT Groups & Threat Actors">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-4">
            {THREAT_ACTORS.map(actor => {
              const iocs = indicators.filter(i => i.threat_actor === actor || i.threat_actor?.includes(actor.split(' ')[0]));
              return (
                <div key={actor} className="border rounded p-3" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{actor}</div>
                    {iocs.length > 0 && <span className="bg-red-900/40 text-red-400 border border-red-800 text-xs px-1.5 py-0.5 rounded">{iocs.length} IOCs</span>}
                  </div>
                  <div className="text-xs text-gray-600">
                    {iocs.length > 0 ? `Last seen: ${timeAgo(iocs[0].last_seen)}` : 'No active indicators'}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {activeTab === 'feeds' && (
        <Panel title="Threat Feed Sources">
          <Table
            columns={[
              { key: 'name', label: 'Feed Name' },
              { key: 'type', label: 'Type' },
              { key: 'status', label: 'Status' },
              { key: 'indicators', label: 'Indicators' },
              { key: 'lastSync', label: 'Last Sync' },
            ]}
            rows={FEED_SOURCES.map(f => ({
              name: <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{f.name}</span>,
              type: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f.type}</span>,
              status: <Badge text={f.status} type="status" />,
              indicators: <span className="text-sm font-mono text-blue-400">{f.indicators}</span>,
              lastSync: <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.lastSync}</span>,
            }))}
          />
        </Panel>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Indicator Detail" width="max-w-2xl">
        {selected && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Type</div>
                <div className="uppercase font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{selected.indicator_type}</div>
              </div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Severity</div>
                <Badge text={selected.severity} type="severity" />
              </div>
              <div className="rounded p-3 col-span-2" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Indicator Value</div>
                <div className="text-green-400 font-mono break-all">{selected.indicator_value}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Threat Score</div>
                <div className={`text-xl font-bold font-mono ${selected.threat_score >= 80 ? 'text-red-400' : 'text-yellow-400'}`}>{selected.threat_score}/100</div>
              </div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Confidence</div>
                <div className="text-xl font-bold font-mono text-blue-400">{selected.confidence}%</div>
              </div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Status</div>
                <div className={`text-sm font-bold ${selected.active ? 'text-green-400' : 'text-gray-600'}`}>{selected.active ? 'Active' : 'Inactive'}</div>
              </div>
            </div>
            {selected.threat_actor && (
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Threat Actor</div>
                <div className="text-orange-400 font-semibold">{selected.threat_actor}</div>
              </div>
            )}
            {selected.malware_family && (
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Malware Family</div>
                <div className="text-yellow-400 font-semibold">{selected.malware_family}</div>
              </div>
            )}
            {selected.description && (
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Description</div>
                <div className="text-gray-300">{selected.description}</div>
              </div>
            )}
            {selected.tags && selected.tags.length > 0 && (
              <div>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Tags</div>
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map((t, i) => (
                    <span key={i} className="bg-gray-800 border border-gray-700 px-2 py-0.5 rounded text-xs" style={{ color: 'var(--text-secondary)' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-gray-600">
              <div>First seen: {formatDate(selected.first_seen)}</div>
              <div>Last seen: {formatDate(selected.last_seen)}</div>
              <div>Source: {selected.source}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add IOC Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add IOC">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Type</label>
              <Select value={form.indicator_type} onChange={v => setForm(p => ({ ...p, indicator_type: v }))} options={TYPES.slice(1)} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Severity</label>
              <Select value={form.severity} onChange={v => setForm(p => ({ ...p, severity: v }))} options={[
                { value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }
              ]} />
            </div>
          </div>
          <Input label="Indicator Value *" value={form.indicator_value} onChange={e => setForm(p => ({ ...p, indicator_value: e.target.value }))} placeholder="IP, domain, hash, URL..." />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Threat Score (0-100)</label>
              <input type="number" min={0} max={100} value={form.threat_score} onChange={e => setForm(p => ({ ...p, threat_score: Number(e.target.value) }))}
                className="w-full rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Confidence (%)</label>
              <input type="number" min={0} max={100} value={form.confidence} onChange={e => setForm(p => ({ ...p, confidence: Number(e.target.value) }))}
                className="w-full rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            </div>
          </div>
          <Input label="Threat Actor" value={form.threat_actor} onChange={e => setForm(p => ({ ...p, threat_actor: e.target.value }))} placeholder="APT29" />
          <Input label="Malware Family" value={form.malware_family} onChange={e => setForm(p => ({ ...p, malware_family: e.target.value }))} placeholder="Ryuk" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addIndicator} disabled={saving || !form.indicator_value}>{saving ? 'Saving...' : 'Add Indicator'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
