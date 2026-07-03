import React, { useEffect, useState } from 'react';
import { Plus, Microscope, Lock, HardDrive, Cpu } from 'lucide-react';
import { supabase, ForensicCase } from '../lib/supabase';
import { Panel, Badge, Button, Table, Modal, Input, Textarea, Select, SearchInput } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
];

const EXAMINERS = ['alice.johnson', 'bob.williams', 'charlie.brown', 'diana.prince', 'evan.rogers'];

const ANALYSIS_TOOLS = [
  { name: 'Volatility 3', type: 'Memory Analysis', description: 'Analyze memory dumps for process trees, network connections, injected code' },
  { name: 'Autopsy', type: 'Disk Forensics', description: 'File system analysis, deleted file recovery, timeline creation' },
  { name: 'Plaso/log2timeline', type: 'Timeline', description: 'Create super-timelines from multiple artifact sources' },
  { name: 'SIFT Workstation', type: 'Full Suite', description: 'Complete digital forensics investigation environment' },
  { name: 'Rekall', type: 'Memory Analysis', description: 'Advanced memory forensics framework' },
  { name: 'FTK Imager', type: 'Disk Imaging', description: 'Create forensic images and preview evidence' },
];

export default function Forensics() {
  const [cases, setCases] = useState<ForensicCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<ForensicCase | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'cases' | 'tools'>('cases');
  const [newEvidence, setNewEvidence] = useState('');
  const [newFinding, setNewFinding] = useState('');
  const [form, setForm] = useState({ title: '', description: '', examiner: '', status: 'open' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCases(); }, [statusFilter]);

  async function fetchCases() {
    setLoading(true);
    let q = supabase.from('forensic_cases').select('*').order('created_at', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data } = await q;
    setCases(data || []);
    setLoading(false);
  }

  const filtered = cases.filter(c =>
    !search ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.case_number.toLowerCase().includes(search.toLowerCase()) ||
    (c.examiner || '').toLowerCase().includes(search.toLowerCase())
  );

  async function createCase() {
    setSaving(true);
    const caseNum = `FC-${new Date().getFullYear()}-${String(cases.length + 4).padStart(3, '0')}`;
    await supabase.from('forensic_cases').insert([{
      case_number: caseNum,
      title: form.title,
      description: form.description || null,
      examiner: form.examiner || null,
      status: form.status,
    }]);
    setSaving(false);
    setShowCreate(false);
    setForm({ title: '', description: '', examiner: '', status: 'open' });
    fetchCases();
  }

  async function addEvidence() {
    if (!selected || !newEvidence.trim()) return;
    const items = [...((selected.evidence_items as any[]) || []), {
      id: Date.now(),
      description: newEvidence,
      collected_at: new Date().toISOString(),
      collector: 'alice.johnson',
    }];
    await supabase.from('forensic_cases').update({ evidence_items: items, updated_at: new Date().toISOString() }).eq('id', selected.id);
    setNewEvidence('');
    setSelected(prev => prev ? { ...prev, evidence_items: items } : null);
    fetchCases();
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('forensic_cases').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchCases();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-4 gap-3">
        <div className="border rounded p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Total Cases</div><div className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{cases.length}</div></div>
        <div className="bg-[#1E293B] border border-yellow-800 rounded p-3"><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Open</div><div className="text-2xl font-bold font-mono text-yellow-400">{cases.filter(c => c.status === 'open').length}</div></div>
        <div className="bg-[#1E293B] border border-blue-800 rounded p-3"><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>In Progress</div><div className="text-2xl font-bold font-mono text-blue-400">{cases.filter(c => c.status === 'in_progress').length}</div></div>
        <div className="bg-[#1E293B] border border-green-800 rounded p-3"><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Closed</div><div className="text-2xl font-bold font-mono text-green-400">{cases.filter(c => c.status === 'closed').length}</div></div>
      </div>

      <div className="flex gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['cases', 'tools'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${activeTab === t ? 'border-blue-500 text-blue-400' : 'border-transparent hover:text-gray-300'}`}
            style={activeTab !== t ? { color: 'var(--text-muted)' } : undefined}>
            {t === 'cases' ? 'Cases' : 'Analysis Tools'}
          </button>
        ))}
      </div>

      {activeTab === 'cases' && (
        <Panel
          title="Forensic Cases"
          actions={
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search cases..." className="w-48" />
              <Select value={statusFilter} onChange={setStatusFilter} options={STATUSES} />
              <Button onClick={() => setShowCreate(true)}>
                <Plus size={13} /> New Case
              </Button>
            </div>
          }
        >
          <Table
            loading={loading}
            columns={[
              { key: 'case_num', label: 'Case #', width: 'w-32' },
              { key: 'title', label: 'Title' },
              { key: 'status', label: 'Status', width: 'w-28' },
              { key: 'examiner', label: 'Examiner', width: 'w-36' },
              { key: 'evidence', label: 'Evidence Items', width: 'w-28' },
              { key: 'created', label: 'Created', width: 'w-28' },
            ]}
            rows={filtered.map(c => ({
              case_num: <span className="text-xs font-mono text-blue-400">{c.case_number}</span>,
              title: <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.title}</span>,
              status: <Badge text={c.status.replace('_', ' ')} type="status" />,
              examiner: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.examiner || 'Unassigned'}</span>,
              evidence: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{Array.isArray(c.evidence_items) ? (c.evidence_items as any[]).length : 0} items</span>,
              created: <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>,
            }))}
            onRowClick={i => setSelected(filtered[i])}
          />
        </Panel>
      )}

      {activeTab === 'tools' && (
        <Panel title="Digital Forensics Tools">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-4">
            {ANALYSIS_TOOLS.map((tool, i) => (
              <div key={i} className="border rounded p-3" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tool.name}</div>
                  <span className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800 rounded px-2 py-0.5">{tool.type}</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{tool.description}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Case Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected?.case_number}: ${selected?.title}`} width="max-w-3xl">
        {selected && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Case Number</div><div className="text-blue-400 font-mono font-bold">{selected.case_number}</div></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Status</div><Badge text={selected.status.replace('_', ' ')} type="status" /></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Examiner</div><div className="text-gray-300">{selected.examiner || 'Unassigned'}</div></div>
            </div>

            {selected.description && (
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-secondary)' }}>{selected.description}</div>
            )}

            {/* Status Update */}
            <div>
              <div className="mb-2" style={{ color: 'var(--text-muted)' }}>Update Status</div>
              <div className="flex gap-2">
                {['open', 'in_progress', 'closed'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${selected.status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
                    style={selected.status !== s ? { color: 'var(--text-secondary)' } : undefined}>
                    {s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence Items */}
            <div>
              <div className="mb-2" style={{ color: 'var(--text-muted)' }}>Evidence Items ({Array.isArray(selected.evidence_items) ? (selected.evidence_items as any[]).length : 0})</div>
              <div className="rounded border max-h-32 overflow-y-auto p-2 space-y-1 mb-2" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                {!Array.isArray(selected.evidence_items) || (selected.evidence_items as any[]).length === 0 ? (
                  <div className="text-gray-600">No evidence collected yet.</div>
                ) : (
                  (selected.evidence_items as any[]).map((e: any, i: number) => (
                    <div key={i} className="text-xs">
                      <span className="text-gray-500 font-mono">[{new Date(e.collected_at).toISOString().slice(0, 16)}]</span>
                      <span className="text-gray-300 ml-2">{e.description}</span>
                      <span className="text-gray-600 ml-2">by {e.collector}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input value={newEvidence} onChange={e => setNewEvidence(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEvidence()}
                  placeholder="Describe evidence item (disk image, memory dump, logs...)"
                  className="flex-1 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                <Button size="xs" onClick={addEvidence}>Add Evidence</Button>
              </div>
            </div>

            {selected.findings && (
              <div>
                <div className="mb-1" style={{ color: 'var(--text-muted)' }}>Findings</div>
                <div className="rounded p-3 text-gray-300" style={{ backgroundColor: 'var(--bg-base)' }}>{selected.findings}</div>
              </div>
            )}

            <div className="text-gray-600">Created: {formatDate(selected.created_at)} | Chain of Custody: {Array.isArray(selected.chain_of_custody) ? (selected.chain_of_custody as any[]).length : 0} entries</div>
          </div>
        )}
      </Modal>

      {/* Create Case Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Forensic Case">
        <div className="space-y-3">
          <Input label="Case Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ransomware Investigation - Host01" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe the forensic investigation..." />
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Assigned Examiner</label>
            <Select value={form.examiner} onChange={v => setForm(p => ({ ...p, examiner: v }))} options={[{ value: '', label: 'Unassigned' }, ...EXAMINERS.map(e => ({ value: e, label: e }))]} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createCase} disabled={saving || !form.title}>{saving ? 'Creating...' : 'Create Case'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
