import React, { useEffect, useState } from 'react';
import { Filter, CheckSquare, XCircle, EyeOff } from 'lucide-react';
import { supabase, Alert } from '../lib/supabase';
import { Panel, Badge, Button, Table, Modal, SearchInput, Select } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

const SEVERITIES = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'info', label: 'Info' },
];
const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
];

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Alert | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchAlerts(); }, [sevFilter, statusFilter]);

  async function fetchAlerts() {
    setLoading(true);
    let q = supabase.from('alerts').select('*').eq('suppressed', false).order('created_at', { ascending: false });
    if (sevFilter) q = q.eq('severity', sevFilter);
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data } = await q;
    setAlerts(data || []);
    setLoading(false);
  }

  const filtered = alerts.filter(a =>
    !search ||
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.source_ip || '').includes(search) ||
    (a.mitre_technique || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.source || '').toLowerCase().includes(search.toLowerCase())
  );

  async function updateStatus(id: string, status: string) {
    await supabase.from('alerts').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchAlerts();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  }

  async function suppressAlert(id: string) {
    await supabase.from('alerts').update({ suppressed: true, updated_at: new Date().toISOString() }).eq('id', id);
    fetchAlerts();
    setSelected(null);
  }

  async function markFalsePositive(id: string) {
    await supabase.from('alerts').update({ false_positive: true, status: 'resolved', updated_at: new Date().toISOString() }).eq('id', id);
    fetchAlerts();
    setSelected(null);
  }

  async function bulkResolve() {
    for (const id of selectedIds) {
      await supabase.from('alerts').update({ status: 'resolved', updated_at: new Date().toISOString() }).eq('id', id);
    }
    setSelectedIds(new Set());
    fetchAlerts();
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Severity stat bar */}
      <div className="grid grid-cols-6 gap-3">
        {['all', 'critical', 'high', 'medium', 'low', 'info'].map(sev => {
          const count = sev === 'all' ? alerts.length : alerts.filter(a => a.severity === sev).length;
          const textColors: Record<string, string | undefined> = {
            all: undefined,
            critical: 'text-red-400',
            high: 'text-orange-400',
            medium: 'text-yellow-400',
            low: 'text-blue-400',
            info: undefined,
          };
          const borderColors: Record<string, string> = {
            all: 'border-gray-600',
            critical: 'border-red-800',
            high: 'border-orange-800',
            medium: 'border-yellow-800',
            low: 'border-blue-800',
            info: '',
          };
          const isActive = sevFilter === sev || (sev === 'all' && !sevFilter);
          const countStyle = !textColors[sev] ? { color: sev === 'info' ? 'var(--text-secondary)' : 'var(--text-primary)' } : undefined;
          const borderStyle = (sev === 'info' && !isActive) ? { borderColor: 'var(--border)' } : undefined;
          return (
            <button key={sev} onClick={() => setSevFilter(sev === 'all' ? '' : sev === sevFilter ? '' : sev)}
              style={{ backgroundColor: 'var(--bg-surface)', ...borderStyle }}
              className={`rounded border p-3 text-left transition-colors ${isActive ? 'border-blue-500' : borderColors[sev]}`}>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{sev === 'all' ? 'Total' : sev}</div>
              <div className={`text-xl font-bold font-mono${textColors[sev] ? ' ' + textColors[sev] : ''}`} style={countStyle}>{count}</div>
            </button>
          );
        })}
      </div>

      <Panel
        title="Alert Center"
        actions={
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search alerts..." className="w-56" />
            <Select value={statusFilter} onChange={setStatusFilter} options={STATUSES} />
            {selectedIds.size > 0 && (
              <Button variant="secondary" onClick={bulkResolve}>
                <CheckSquare size={13} /> Resolve ({selectedIds.size})
              </Button>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="py-2 px-3 w-8">
                  <input type="checkbox" className="accent-blue-500" onChange={e => {
                    if (e.target.checked) setSelectedIds(new Set(filtered.map(a => a.id)));
                    else setSelectedIds(new Set());
                  }} checked={selectedIds.size === filtered.length && filtered.length > 0} />
                </th>
                {['Severity', 'Title', 'Source', 'Src IP', 'MITRE Tactic', 'MITRE Technique', 'Status', 'Created'].map(col => (
                  <th key={col} className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{col}</th>
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
              ) : filtered.map(alert => (
                <tr key={alert.id} className="cursor-pointer hover:bg-gray-700/30" style={{ borderBottom: '1px solid var(--border)' }}
                  onClick={() => setSelected(alert)}>
                  <td className="py-2 px-3" onClick={e => { e.stopPropagation(); toggleSelect(alert.id); }}>
                    <input type="checkbox" className="accent-blue-500" checked={selectedIds.has(alert.id)} onChange={() => toggleSelect(alert.id)} />
                  </td>
                  <td className="py-2 px-3"><Badge text={alert.severity} type="severity" /></td>
                  <td className="py-2 px-3 max-w-xs" style={{ color: 'var(--text-primary)' }}>
                    <div className="truncate">{alert.title}</div>
                    {alert.false_positive && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>[False Positive]</span>}
                  </td>
                  <td className="py-2 px-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{alert.source || '-'}</td>
                  <td className="py-2 px-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{alert.source_ip || '-'}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{alert.mitre_tactic || '-'}</td>
                  <td className="py-2 px-3 text-xs text-blue-400">{alert.mitre_technique_id ? `${alert.mitre_technique_id}` : alert.mitre_technique || '-'}</td>
                  <td className="py-2 px-3"><Badge text={alert.status} type="status" /></td>
                  <td className="py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(alert.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No alerts match your filters.</div>
          )}
        </div>
        <div className="px-4 py-2 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          {filtered.length} alerts shown
        </div>
      </Panel>

      {/* Alert Detail */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Alert Detail" width="max-w-3xl">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-100 mb-1">{selected.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.description || 'No description.'}</p>
              </div>
              <div className="flex gap-2 ml-4">
                <Badge text={selected.severity} type="severity" />
                <Badge text={selected.status} type="status" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Source:</span> <span className="text-gray-300">{selected.source || '-'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Source IP:</span> <span className="text-gray-300 font-mono">{selected.source_ip || '-'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Destination IP:</span> <span className="text-gray-300 font-mono">{selected.destination_ip || '-'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Assignee:</span> <span className="text-gray-300">{selected.assignee || 'Unassigned'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>MITRE Tactic:</span> <span className="text-blue-400">{selected.mitre_tactic || '-'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>MITRE Technique:</span> <span className="text-blue-400">{selected.mitre_technique} {selected.mitre_technique_id ? `(${selected.mitre_technique_id})` : ''}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Created:</span> <span className="text-gray-300">{formatDate(selected.created_at)}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>False Positive:</span> <span className={selected.false_positive ? 'text-yellow-400' : 'text-gray-600'}>{selected.false_positive ? 'Yes' : 'No'}</span></div>
            </div>

            {selected.raw_log && (
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Raw Log</div>
                <pre className="rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: '#4ade80', borderWidth: '1px', borderStyle: 'solid' }}>
                  {selected.raw_log}
                </pre>
              </div>
            )}

            <div>
              <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Actions</div>
              <div className="flex flex-wrap gap-2">
                {['investigating', 'resolved'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className={`px-3 py-1.5 rounded text-xs border transition-colors ${selected.status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-800 hover:border-gray-500'}`}
                    style={selected.status !== s ? { color: 'var(--text-secondary)', borderColor: 'var(--border)' } : undefined}>
                    Mark {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
                <Button variant="ghost" size="xs" onClick={() => markFalsePositive(selected.id)}>
                  <XCircle size={12} /> False Positive
                </Button>
                <Button variant="ghost" size="xs" onClick={() => suppressAlert(selected.id)}>
                  <EyeOff size={12} /> Suppress
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
