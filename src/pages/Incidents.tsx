import React, { useEffect, useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { supabase, Incident } from '../lib/supabase';
import { Panel, Badge, Button, Table, Modal, Input, Textarea, Select, SearchInput } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'contained', label: 'Contained' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const SEVERITIES = [
  { value: '', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const ANALYSTS = ['deepanshu.sharma', 'bob.williams', 'charlie.brown', 'diana.prince', 'evan.rogers'];

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Incident | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newAction, setNewAction] = useState('');
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium', priority: 'p2', assignee: '', affected_assets: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchIncidents(); }, [statusFilter]);

  async function fetchIncidents() {
    setLoading(true);
    let q = supabase.from('incidents').select('*').order('created_at', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data } = await q;
    setIncidents(data || []);
    setLoading(false);
  }

  const filtered = incidents.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.assignee || '').toLowerCase().includes(search.toLowerCase())
  );

  async function createIncident() {
    setCreating(true);
    await supabase.from('incidents').insert([{
      title: form.title,
      description: form.description,
      severity: form.severity,
      priority: form.priority,
      assignee: form.assignee || null,
      status: 'open',
      affected_assets: form.affected_assets ? form.affected_assets.split(',').map(s => s.trim()) : [],
    }]);
    setCreating(false);
    setShowCreate(false);
    setForm({ title: '', description: '', severity: 'medium', priority: 'p2', assignee: '', affected_assets: '' });
    fetchIncidents();
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('incidents').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchIncidents();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  }

  async function addNote() {
    if (!selected || !newNote.trim()) return;
    const notes = [...(selected.notes || []), `[${new Date().toISOString().slice(0, 16)}] ${newNote}`];
    await supabase.from('incidents').update({ notes, updated_at: new Date().toISOString() }).eq('id', selected.id);
    setNewNote('');
    setSelected(prev => prev ? { ...prev, notes } : null);
    fetchIncidents();
  }

  async function addContainmentAction() {
    if (!selected || !newAction.trim()) return;
    const actions = [...(selected.containment_actions || []), `[${new Date().toISOString().slice(0, 16)}] ${newAction}`];
    await supabase.from('incidents').update({ containment_actions: actions, updated_at: new Date().toISOString() }).eq('id', selected.id);
    setNewAction('');
    setSelected(prev => prev ? { ...prev, containment_actions: actions } : null);
    fetchIncidents();
  }

  const statusColors: Record<string, string> = {
    open: 'bg-red-900/30 text-red-300',
    investigating: 'bg-yellow-900/30 text-yellow-300',
    contained: 'bg-orange-900/30 text-orange-300',
    resolved: 'bg-green-900/30 text-green-300',
    closed: 'bg-gray-800 text-gray-400',
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-5 gap-3">
        {['open', 'investigating', 'contained', 'resolved', 'closed'].map(s => {
          const count = incidents.filter(i => i.status === s).length;
          return (
            <button key={s} onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: statusFilter === s ? undefined : 'var(--border)' }}
              className={`rounded border p-3 text-left transition-colors ${statusFilter === s ? 'border-blue-500' : ''}`}>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{s}</div>
              <div className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{count}</div>
            </button>
          );
        })}
      </div>

      <Panel
        title="Incident Registry"
        actions={
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search incidents..." className="w-56" />
            <Select value={statusFilter} onChange={setStatusFilter} options={STATUSES} />
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Create Incident
            </Button>
          </div>
        }
      >
        <Table
          columns={[
            { key: 'id_short', label: 'ID', width: 'w-28' },
            { key: 'title', label: 'Title' },
            { key: 'severity', label: 'Severity', width: 'w-24' },
            { key: 'priority', label: 'Priority', width: 'w-16' },
            { key: 'status', label: 'Status', width: 'w-28' },
            { key: 'assignee', label: 'Assignee', width: 'w-32' },
            { key: 'assets', label: 'Affected Assets', width: 'w-40' },
            { key: 'time', label: 'Created', width: 'w-32' },
          ]}
          rows={filtered.map(inc => ({
            id_short: <span className="text-xs font-mono text-gray-500">{inc.id.slice(0, 8)}</span>,
            title: <span className="text-sm text-gray-200 font-medium">{inc.title}</span>,
            severity: <Badge text={inc.severity} type="severity" />,
            priority: <span className="text-xs font-bold text-orange-400 uppercase">{inc.priority}</span>,
            status: <Badge text={inc.status} type="status" />,
            assignee: <span className="text-xs text-gray-400">{inc.assignee || 'Unassigned'}</span>,
            assets: <span className="text-xs text-gray-500">{inc.affected_assets?.slice(0, 2).join(', ') || '-'}</span>,
            time: <span className="text-xs text-gray-500">{timeAgo(inc.created_at)}</span>,
          }))}
          loading={loading}
          onRowClick={i => setSelected(filtered[i])}
        />
      </Panel>

      {/* Incident Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Incident: ${selected?.title}`} width="max-w-4xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="rounded p-2" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Severity</div><Badge text={selected.severity} type="severity" /></div>
              <div className="rounded p-2" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Status</div><Badge text={selected.status} type="status" /></div>
              <div className="rounded p-2" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Priority</div><span className="text-orange-400 font-bold uppercase">{selected.priority}</span></div>
              <div className="rounded p-2" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Assignee</div><span className="text-gray-300">{selected.assignee || 'Unassigned'}</span></div>
            </div>

            <div className="text-xs rounded p-3" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-base)' }}>{selected.description || 'No description.'}</div>

            {selected.affected_assets?.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Affected Assets</div>
                <div className="flex flex-wrap gap-1">
                  {selected.affected_assets.map((a, i) => (
                    <span key={i} className="text-xs bg-gray-800 text-gray-300 rounded px-2 py-0.5 font-mono border" style={{ borderColor: 'var(--border)' }}>{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Status Actions */}
            <div>
              <div className="text-xs text-gray-500 mb-2">Update Status</div>
              <div className="flex flex-wrap gap-2">
                {['open', 'investigating', 'contained', 'resolved', 'closed'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${selected.status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-800 hover:border-gray-500'}`}
                    style={selected.status !== s ? { color: 'var(--text-secondary)', borderColor: 'var(--border)' } : undefined}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Case Notes */}
            <div>
              <div className="text-xs text-gray-500 mb-2">Case Notes ({selected.notes?.length || 0})</div>
              <div className="rounded max-h-32 overflow-y-auto p-2 space-y-1 mb-2" style={{ backgroundColor: 'var(--bg-base)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}>
                {(selected.notes || []).length === 0 ? (
                  <div className="text-xs text-gray-600">No notes yet.</div>
                ) : (
                  selected.notes.map((n, i) => (
                    <div key={i} className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{n}</div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()}
                  placeholder="Add case note..." className="flex-1 border rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                <Button size="xs" onClick={addNote}>Add Note</Button>
              </div>
            </div>

            {/* Containment Actions */}
            <div>
              <div className="text-xs text-gray-500 mb-2">Containment Actions ({selected.containment_actions?.length || 0})</div>
              <div className="rounded max-h-28 overflow-y-auto p-2 space-y-1 mb-2" style={{ backgroundColor: 'var(--bg-base)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}>
                {(selected.containment_actions || []).length === 0 ? (
                  <div className="text-xs text-gray-600">No containment actions logged.</div>
                ) : (
                  selected.containment_actions.map((a, i) => (
                    <div key={i} className="text-xs text-orange-300 font-mono">{a}</div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input value={newAction} onChange={e => setNewAction(e.target.value)} onKeyDown={e => e.key === 'Enter' && addContainmentAction()}
                  placeholder="Log containment action..." className="flex-1 border rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                <Button size="xs" variant="danger" onClick={addContainmentAction}>Log Action</Button>
              </div>
            </div>

            <div className="text-xs text-gray-600">Created: {formatDate(selected.created_at)} | Updated: {formatDate(selected.updated_at)}</div>
          </div>
        )}
      </Modal>

      {/* Create Incident Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Incident">
        <div className="space-y-3">
          <Input label="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Incident title" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe the incident..." />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Severity</label>
              <Select value={form.severity} onChange={v => setForm(p => ({ ...p, severity: v }))} options={SEVERITIES.slice(1)} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Priority</label>
              <Select value={form.priority} onChange={v => setForm(p => ({ ...p, priority: v }))} options={[
                { value: 'p1', label: 'P1 - Critical' }, { value: 'p2', label: 'P2 - High' },
                { value: 'p3', label: 'P3 - Medium' }, { value: 'p4', label: 'P4 - Low' }
              ]} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Assignee</label>
            <Select value={form.assignee} onChange={v => setForm(p => ({ ...p, assignee: v }))} options={[{ value: '', label: 'Unassigned' }, ...ANALYSTS.map(a => ({ value: a, label: a }))]} />
          </div>
          <Input label="Affected Assets (comma-separated)" value={form.affected_assets} onChange={e => setForm(p => ({ ...p, affected_assets: e.target.value }))} placeholder="dc01, workstation-101" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createIncident} disabled={creating || !form.title}>{creating ? 'Creating...' : 'Create Incident'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
