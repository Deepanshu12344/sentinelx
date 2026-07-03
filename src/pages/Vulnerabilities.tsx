import React, { useEffect, useState } from 'react';
import { Plus, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase, Vulnerability } from '../lib/supabase';
import { Panel, Badge, Button, Table, Modal, Input, Textarea, Select, SearchInput, StatCard } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

const SEVERITIES = [
  { value: '', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_remediation', label: 'In Remediation' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'accepted', label: 'Accepted Risk' },
];

export default function Vulnerabilities() {
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Vulnerability | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ cve_id: '', title: '', description: '', severity: 'medium', cvss_score: '', asset_hostname: '', solution: '', exploit_available: false, patch_available: false, status: 'open' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchVulns(); }, [sevFilter, statusFilter]);

  async function fetchVulns() {
    setLoading(true);
    let q = supabase.from('vulnerabilities').select('*').order('cvss_score', { ascending: false, nullsFirst: false });
    if (sevFilter) q = q.eq('severity', sevFilter);
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data } = await q;
    setVulns(data || []);
    setLoading(false);
  }

  const filtered = vulns.filter(v =>
    !search ||
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    (v.cve_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.asset_hostname || '').toLowerCase().includes(search.toLowerCase())
  );

  async function updateStatus(id: string, status: string) {
    const update: any = { status, updated_at: new Date().toISOString() };
    if (status === 'resolved') update.remediated_at = new Date().toISOString();
    await supabase.from('vulnerabilities').update(update).eq('id', id);
    fetchVulns();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  }

  async function addVuln() {
    setSaving(true);
    await supabase.from('vulnerabilities').insert([{
      cve_id: form.cve_id || null,
      title: form.title,
      description: form.description || null,
      severity: form.severity,
      cvss_score: form.cvss_score ? parseFloat(form.cvss_score) : null,
      asset_hostname: form.asset_hostname || null,
      solution: form.solution || null,
      exploit_available: form.exploit_available,
      patch_available: form.patch_available,
      status: form.status,
    }]);
    setSaving(false);
    setShowAdd(false);
    setForm({ cve_id: '', title: '', description: '', severity: 'medium', cvss_score: '', asset_hostname: '', solution: '', exploit_available: false, patch_available: false, status: 'open' });
    fetchVulns();
  }

  const cvssColor = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 9.0) return 'text-red-400';
    if (score >= 7.0) return 'text-orange-400';
    if (score >= 4.0) return 'text-yellow-400';
    return 'text-blue-400';
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Vulns" value={vulns.length} />
        <StatCard label="Critical" value={vulns.filter(v => v.severity === 'critical').length} color="critical" />
        <StatCard label="With Exploit" value={vulns.filter(v => v.exploit_available).length} color="warning" />
        <StatCard label="Open" value={vulns.filter(v => v.status === 'open').length} color="critical" />
      </div>

      <Panel
        title="Vulnerability Repository"
        actions={
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search CVE, title, host..." className="w-56" />
            <Select value={sevFilter} onChange={setSevFilter} options={SEVERITIES} />
            <Select value={statusFilter} onChange={setStatusFilter} options={STATUSES} />
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={13} /> Add Finding
            </Button>
          </div>
        }
      >
        <Table
          loading={loading}
          columns={[
            { key: 'cve', label: 'CVE ID', width: 'w-36' },
            { key: 'title', label: 'Title' },
            { key: 'severity', label: 'Severity', width: 'w-24' },
            { key: 'cvss', label: 'CVSS', width: 'w-16' },
            { key: 'asset', label: 'Asset', width: 'w-36' },
            { key: 'exploit', label: 'Exploit', width: 'w-20' },
            { key: 'patch', label: 'Patch', width: 'w-20' },
            { key: 'status', label: 'Status', width: 'w-28' },
            { key: 'age', label: 'Detected', width: 'w-24' },
          ]}
          rows={filtered.map(v => ({
            cve: <span className="text-xs font-mono text-blue-400">{v.cve_id || '-'}</span>,
            title: <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{v.title}</span>,
            severity: <Badge text={v.severity} type="severity" />,
            cvss: <span className={`text-sm font-bold font-mono ${cvssColor(v.cvss_score)}`}>{v.cvss_score ?? '-'}</span>,
            asset: <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{v.asset_hostname || '-'}</span>,
            exploit: v.exploit_available ? (
              <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={10} /> Yes</span>
            ) : <span className="text-xs text-gray-600">No</span>,
            patch: v.patch_available ? (
              <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={10} /> Yes</span>
            ) : <span className="text-xs text-gray-600">No</span>,
            status: <Badge text={v.status.replace('_', ' ')} type="status" />,
            age: <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(v.first_detected)}</span>,
          }))}
          onRowClick={i => setSelected(filtered[i])}
        />
        <div className="px-4 py-2 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>{filtered.length} findings</div>
      </Panel>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.cve_id || 'Vulnerability Detail'} width="max-w-3xl">
        {selected && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{selected.title}</div>
                {selected.description && <div style={{ color: 'var(--text-secondary)' }}>{selected.description}</div>}
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-3xl font-bold font-mono ${cvssColor(selected.cvss_score)}`}>{selected.cvss_score ?? 'N/A'}</div>
                <div style={{ color: 'var(--text-muted)' }}>CVSS Score</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Severity</div><Badge text={selected.severity} type="severity" /></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Status</div><Badge text={selected.status.replace('_', ' ')} type="status" /></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Asset</div><span className="font-mono" style={{ color: 'var(--text-primary)' }}>{selected.asset_hostname || '-'}</span></div>
              <div className={`rounded p-3 ${selected.exploit_available ? 'border border-red-800' : ''}`} style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Exploit Available</div>
                <div className={`font-bold ${selected.exploit_available ? 'text-red-400' : 'text-green-400'}`}>{selected.exploit_available ? 'YES' : 'NO'}</div>
              </div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Patch Available</div>
                <div className={`font-bold ${selected.patch_available ? 'text-green-400' : 'text-red-400'}`}>{selected.patch_available ? 'YES' : 'NO'}</div>
              </div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>First Detected</div>
                <div className="text-gray-300">{timeAgo(selected.first_detected)}</div>
              </div>
            </div>

            {selected.solution && (
              <div className="rounded border border-green-900 p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="text-green-600 uppercase tracking-wide mb-1 font-semibold">Remediation</div>
                <div className="text-gray-300">{selected.solution}</div>
              </div>
            )}

            <div>
              <div className="mb-2" style={{ color: 'var(--text-muted)' }}>Update Status</div>
              <div className="flex flex-wrap gap-2">
                {['open', 'in_remediation', 'resolved', 'accepted'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${selected.status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}>
                    {s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Vuln Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Vulnerability Finding">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="CVE ID" value={form.cve_id} onChange={e => setForm(p => ({ ...p, cve_id: e.target.value }))} placeholder="CVE-2024-XXXX" />
            <Input label="CVSS Score" value={form.cvss_score} onChange={e => setForm(p => ({ ...p, cvss_score: e.target.value }))} placeholder="9.8" type="number" min={0} max={10} step={0.1} />
          </div>
          <Input label="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Vulnerability title" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Severity</label>
              <Select value={form.severity} onChange={v => setForm(p => ({ ...p, severity: v }))} options={SEVERITIES.slice(1)} />
            </div>
            <Input label="Asset Hostname" value={form.asset_hostname} onChange={e => setForm(p => ({ ...p, asset_hostname: e.target.value }))} placeholder="dc01.corp.local" />
          </div>
          <Textarea label="Solution" value={form.solution} onChange={e => setForm(p => ({ ...p, solution: e.target.value }))} rows={2} placeholder="Apply patch, disable service..." />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.exploit_available} onChange={e => setForm(p => ({ ...p, exploit_available: e.target.checked }))} className="accent-red-500" />
              Exploit Available
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.patch_available} onChange={e => setForm(p => ({ ...p, patch_available: e.target.checked }))} className="accent-green-500" />
              Patch Available
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addVuln} disabled={saving || !form.title}>{saving ? 'Saving...' : 'Add Finding'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
