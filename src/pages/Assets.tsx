import React, { useEffect, useState } from 'react';
import { Plus, Server, Monitor, Box, Wifi, Cloud } from 'lucide-react';
import { supabase, Asset } from '../lib/supabase';
import { Panel, Badge, Button, Table, Modal, Input, Textarea, Select, SearchInput, StatCard } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

const ASSET_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'server', label: 'Server' },
  { value: 'workstation', label: 'Workstation' },
  { value: 'network', label: 'Network Device' },
  { value: 'container', label: 'Container/Cloud' },
];

const CRITICALITIES = [
  { value: '', label: 'All Criticalities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const typeIcon = (type: string) => {
  switch (type) {
    case 'server': return <Server size={14} />;
    case 'workstation': return <Monitor size={14} />;
    case 'network': return <Wifi size={14} />;
    case 'container': return <Box size={14} />;
    default: return <Cloud size={14} />;
  }
};

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [critFilter, setCritFilter] = useState('');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ hostname: '', ip_address: '', asset_type: 'server', operating_system: '', owner: '', criticality: 'medium', status: 'active', tags: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAssets(); }, [typeFilter, critFilter]);

  async function fetchAssets() {
    setLoading(true);
    let q = supabase.from('assets').select('*').order('criticality', { ascending: false });
    if (typeFilter) q = q.eq('asset_type', typeFilter);
    if (critFilter) q = q.eq('criticality', critFilter);
    const { data } = await q;
    setAssets(data || []);
    setLoading(false);
  }

  const filtered = assets.filter(a =>
    !search ||
    a.hostname.toLowerCase().includes(search.toLowerCase()) ||
    (a.ip_address || '').includes(search) ||
    (a.operating_system || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.owner || '').toLowerCase().includes(search.toLowerCase())
  );

  async function addAsset() {
    setSaving(true);
    await supabase.from('assets').insert([{
      hostname: form.hostname,
      ip_address: form.ip_address || null,
      asset_type: form.asset_type,
      operating_system: form.operating_system || null,
      owner: form.owner || null,
      criticality: form.criticality,
      status: form.status,
      tags: form.tags ? form.tags.split(',').map(s => s.trim()) : [],
    }]);
    setSaving(false);
    setShowAdd(false);
    setForm({ hostname: '', ip_address: '', asset_type: 'server', operating_system: '', owner: '', criticality: 'medium', status: 'active', tags: '' });
    fetchAssets();
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('assets').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchAssets();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  }

  const critOrder = { critical: 4, high: 3, medium: 2, low: 1 };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Assets" value={assets.length} icon={<Server size={20} />} />
        <StatCard label="Critical Assets" value={assets.filter(a => a.criticality === 'critical').length} color="critical" />
        <StatCard label="Servers" value={assets.filter(a => a.asset_type === 'server').length} color="info" />
        <StatCard label="Active" value={assets.filter(a => a.status === 'active').length} color="success" />
      </div>

      <Panel
        title="Asset Inventory"
        actions={
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search hostname, IP, owner..." className="w-56" />
            <Select value={typeFilter} onChange={setTypeFilter} options={ASSET_TYPES} />
            <Select value={critFilter} onChange={setCritFilter} options={CRITICALITIES} />
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={13} /> Add Asset
            </Button>
          </div>
        }
      >
        <Table
          loading={loading}
          columns={[
            { key: 'type', label: 'Type', width: 'w-24' },
            { key: 'hostname', label: 'Hostname' },
            { key: 'ip', label: 'IP Address', width: 'w-32' },
            { key: 'os', label: 'OS', width: 'w-44' },
            { key: 'owner', label: 'Owner', width: 'w-32' },
            { key: 'criticality', label: 'Criticality', width: 'w-24' },
            { key: 'status', label: 'Status', width: 'w-20' },
            { key: 'tags', label: 'Tags', width: 'w-40' },
            { key: 'seen', label: 'Last Seen', width: 'w-28' },
          ]}
          rows={filtered.map(a => ({
            type: (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {typeIcon(a.asset_type)}
                <span className="capitalize">{a.asset_type}</span>
              </div>
            ),
            hostname: <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{a.hostname}</span>,
            ip: <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{a.ip_address || '-'}</span>,
            os: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.operating_system || '-'}</span>,
            owner: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.owner || '-'}</span>,
            criticality: <Badge text={a.criticality} type="severity" />,
            status: <Badge text={a.status} type="status" />,
            tags: (
              <div className="flex flex-wrap gap-1">
                {(a.tags || []).slice(0, 2).map((t, i) => (
                  <span key={i} className="text-xs rounded px-1.5 py-0.5" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>{t}</span>
                ))}
                {(a.tags || []).length > 2 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{a.tags.length - 2}</span>}
              </div>
            ),
            seen: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{timeAgo(a.last_seen)}</span>,
          }))}
          onRowClick={i => setSelected(filtered[i])}
        />
        <div className="px-4 py-2 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>{filtered.length} assets</div>
      </Panel>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Asset: ${selected?.hostname}`} width="max-w-2xl">
        {selected && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Hostname</div><div className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{selected.hostname}</div></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>IP Address</div><div className="font-mono" style={{ color: 'var(--text-primary)' }}>{selected.ip_address || '-'}</div></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Asset Type</div><div className="capitalize" style={{ color: 'var(--text-primary)' }}>{selected.asset_type}</div></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Operating System</div><div style={{ color: 'var(--text-primary)' }}>{selected.operating_system || '-'}</div></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Owner</div><div style={{ color: 'var(--text-primary)' }}>{selected.owner || '-'}</div></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Criticality</div><Badge text={selected.criticality} type="severity" /></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Status</div><Badge text={selected.status} type="status" /></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Last Seen</div><div style={{ color: 'var(--text-primary)' }}>{formatDate(selected.last_seen)}</div></div>
            </div>
            {selected.tags && selected.tags.length > 0 && (
              <div>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Tags</div>
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map((t, i) => (
                    <span key={i} className="border px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="mb-2" style={{ color: 'var(--text-muted)' }}>Update Status</div>
              <div className="flex gap-2">
                {['active', 'inactive', 'decommissioned'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${selected.status === s ? 'bg-blue-600 text-white border-blue-600' : 'hover:border-gray-500'}`}
                    style={selected.status === s ? {} : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Asset Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Asset">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Hostname *" value={form.hostname} onChange={e => setForm(p => ({ ...p, hostname: e.target.value }))} placeholder="dc01.corp.local" />
            <Input label="IP Address" value={form.ip_address} onChange={e => setForm(p => ({ ...p, ip_address: e.target.value }))} placeholder="10.0.1.10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Asset Type</label>
              <Select value={form.asset_type} onChange={v => setForm(p => ({ ...p, asset_type: v }))} options={ASSET_TYPES.slice(1)} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Criticality</label>
              <Select value={form.criticality} onChange={v => setForm(p => ({ ...p, criticality: v }))} options={CRITICALITIES.slice(1)} />
            </div>
          </div>
          <Input label="Operating System" value={form.operating_system} onChange={e => setForm(p => ({ ...p, operating_system: e.target.value }))} placeholder="Windows Server 2022" />
          <Input label="Owner" value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} placeholder="IT Ops" />
          <Input label="Tags (comma-separated)" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="windows, production, critical" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addAsset} disabled={saving || !form.hostname}>{saving ? 'Saving...' : 'Add Asset'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
