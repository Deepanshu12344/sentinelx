import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Shield } from 'lucide-react';
import { supabase, UserProfile } from '../lib/supabase';
import { Panel, Button, Table, Modal, Input, Select, Badge } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'soc_lead', label: 'SOC Lead' },
  { value: 'analyst', label: 'SOC Analyst' },
  { value: 'ir_analyst', label: 'IR Analyst' },
  { value: 'threat_hunter', label: 'Threat Hunter' },
  { value: 'readonly', label: 'Read Only' },
];

const roleBadge = (role: string) => {
  const colors: Record<string, string> = {
    admin: 'bg-red-900/30 text-red-400 border border-red-800',
    soc_lead: 'bg-orange-900/30 text-orange-400 border border-orange-800',
    analyst: 'bg-blue-900/30 text-blue-400 border border-blue-800',
    ir_analyst: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800',
    threat_hunter: 'bg-purple-900/30 text-purple-400 border border-purple-800',
    readonly: 'bg-gray-800 text-gray-500 border border-gray-700',
  };
  const label = ROLES.find(r => r.value === role)?.label || role;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[role] || colors.readonly}`}>{label}</span>;
};

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: '', full_name: '', email: '', role: 'analyst', department: '' });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<UserProfile | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase.from('user_profiles').select('*').order('role');
    setUsers(data || []);
    setLoading(false);
  }

  async function addUser() {
    setSaving(true);
    await supabase.from('user_profiles').insert([{
      username: form.username,
      full_name: form.full_name || null,
      email: form.email,
      role: form.role,
      department: form.department || null,
      active: true,
    }]);
    setSaving(false);
    setShowAdd(false);
    setForm({ username: '', full_name: '', email: '', role: 'analyst', department: '' });
    fetchUsers();
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from('user_profiles').update({ active: !active }).eq('id', id);
    fetchUsers();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, active: !active } : null);
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-4 gap-3">
        <div className="border border-gray-700 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Total Users</div><div className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{users.length}</div></div>
        <div className="border border-green-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Active</div><div className="text-2xl font-bold font-mono text-green-400">{users.filter(u => u.active).length}</div></div>
        <div className="border border-red-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Admins</div><div className="text-2xl font-bold font-mono text-red-400">{users.filter(u => u.role === 'admin').length}</div></div>
        <div className="border border-blue-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Analysts</div><div className="text-2xl font-bold font-mono text-blue-400">{users.filter(u => u.role === 'analyst' || u.role === 'soc_lead').length}</div></div>
      </div>

      <Panel
        title="User Management"
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={13} /> Add User
          </Button>
        }
      >
        <Table
          loading={loading}
          columns={[
            { key: 'user', label: 'User' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role', width: 'w-36' },
            { key: 'department', label: 'Department', width: 'w-36' },
            { key: 'status', label: 'Status', width: 'w-20' },
            { key: 'last_login', label: 'Last Login', width: 'w-28' },
            { key: 'actions', label: '', width: 'w-20' },
          ]}
          rows={users.map(u => ({
            user: (
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.full_name || u.username}</div>
                <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>@{u.username}</div>
              </div>
            ),
            email: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{u.email}</span>,
            role: roleBadge(u.role),
            department: <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.department || '-'}</span>,
            status: (
              <span className={`text-xs font-medium ${u.active ? 'text-green-400' : 'text-gray-600'}`}>
                {u.active ? 'Active' : 'Inactive'}
              </span>
            ),
            last_login: <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.last_login ? timeAgo(u.last_login) : 'Never'}</span>,
            actions: (
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelected(u)} className="p-1 rounded hover:bg-gray-700" style={{ color: 'var(--text-muted)' }}>
                  <Edit2 size={12} />
                </button>
              </div>
            ),
          }))}
          onRowClick={i => setSelected(users[i])}
        />
      </Panel>

      <Panel title="Role Permissions Matrix">
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left py-2 px-3" style={{ color: 'var(--text-muted)' }}>Permission</th>
                {ROLES.map(r => (
                  <th key={r.value} className="text-center py-2 px-3" style={{ color: 'var(--text-muted)' }}>{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['View SIEM Events', true, true, true, true, true, true],
                ['Create Alerts', false, true, true, true, false, false],
                ['Manage Incidents', false, true, true, true, false, false],
                ['Run Playbooks', true, true, true, true, true, false],
                ['Malware Analysis', true, true, true, true, true, false],
                ['OSINT Investigation', true, true, true, true, true, false],
                ['Manage Users', true, false, false, false, false, false],
                ['Edit SIEM Rules', true, true, false, false, false, false],
                ['View Reports', true, true, true, true, true, true],
                ['System Settings', true, false, false, false, false, false],
              ].map(([perm, ...perms]) => (
                <tr key={String(perm)} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{perm}</td>
                  {(perms as boolean[]).map((allowed, i) => (
                    <td key={i} className="py-2 px-3 text-center">
                      {allowed ? (
                        <span className="text-green-400">&#10003;</span>
                      ) : (
                        <span className="text-gray-700">&#10007;</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`User: ${selected?.username}`}>
        {selected && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Full Name</div><div style={{ color: 'var(--text-primary)' }}>{selected.full_name || '-'}</div></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Email</div><div style={{ color: 'var(--text-primary)' }}>{selected.email}</div></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Role</div>{roleBadge(selected.role)}</div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Department</div><div style={{ color: 'var(--text-primary)' }}>{selected.department || '-'}</div></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Status</div><div className={selected.active ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{selected.active ? 'Active' : 'Inactive'}</div></div>
              <div className="rounded p-3" style={{ backgroundColor: 'var(--bg-base)' }}><div className="mb-1" style={{ color: 'var(--text-muted)' }}>Last Login</div><div style={{ color: 'var(--text-primary)' }}>{selected.last_login ? timeAgo(selected.last_login) : 'Never'}</div></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant={selected.active ? 'danger' : 'secondary'} onClick={() => toggleActive(selected.id, selected.active)}>
                {selected.active ? 'Deactivate User' : 'Activate User'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add User">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Username *" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="john.doe" />
            <Input label="Full Name" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="John Doe" />
          </div>
          <Input label="Email *" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@company.com" type="email" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
              <Select value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))} options={ROLES} />
            </div>
            <Input label="Department" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="SOC" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addUser} disabled={saving || !form.username || !form.email}>{saving ? 'Adding...' : 'Add User'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
