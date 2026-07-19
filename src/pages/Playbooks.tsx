import React, { useEffect, useState } from 'react';
import { Plus, Play, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { supabase, Playbook } from '../lib/supabase';
import { Panel, Badge, Button, Table, Modal, Input, Textarea, Select } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

interface PlaybookStep {
  order: number;
  name: string;
  action: string;
  description?: string;
}

interface ExecutionStep {
  order: number;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  output?: string;
}

export default function Playbooks() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Playbook | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [execSteps, setExecSteps] = useState<ExecutionStep[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', trigger_type: 'manual' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPlaybooks(); }, []);

  async function fetchPlaybooks() {
    setLoading(true);
    const { data } = await supabase.from('playbooks').select('*').order('run_count', { ascending: false });
    setPlaybooks(data || []);
    setLoading(false);
  }

  async function togglePlaybook(id: string, enabled: boolean) {
    await supabase.from('playbooks').update({ enabled: !enabled, updated_at: new Date().toISOString() }).eq('id', id);
    fetchPlaybooks();
  }

  async function executePlaybook(pb: Playbook) {
    setExecuting(pb.id);
    const steps = (pb.steps as PlaybookStep[]) || [];
    const execState: ExecutionStep[] = steps.map(s => ({ order: s.order, name: s.name, status: 'pending' }));
    setExecSteps([...execState]);

    for (let i = 0; i < execState.length; i++) {
      execState[i].status = 'running';
      setExecSteps([...execState]);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

      const failed = Math.random() < 0.05;
      execState[i].status = failed ? 'error' : 'success';
      execState[i].duration = Math.floor(300 + Math.random() * 700);
      execState[i].output = failed ? 'Action failed: timeout' : `${steps[i].action} completed successfully`;
      setExecSteps([...execState]);

      if (failed) break;
    }

    await supabase.from('playbook_executions').insert([{
      playbook_id: pb.id,
      status: execState.every(s => s.status === 'success') ? 'completed' : 'failed',
      triggered_by: 'deepanshu.sharma',
      steps_results: execState,
      completed_at: new Date().toISOString(),
    }]);

    await supabase.from('playbooks').update({ run_count: pb.run_count + 1, last_run: new Date().toISOString() }).eq('id', pb.id);
    fetchPlaybooks();
    setExecuting(null);
  }

  async function createPlaybook() {
    setSaving(true);
    await supabase.from('playbooks').insert([{
      name: form.name,
      description: form.description || null,
      trigger_type: form.trigger_type,
      steps: [],
      enabled: true,
      created_by: 'deepanshu.sharma',
    }]);
    setSaving(false);
    setShowCreate(false);
    setForm({ name: '', description: '', trigger_type: 'manual' });
    fetchPlaybooks();
  }

  const stepStatusIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'success': return <CheckCircle size={14} className="text-green-400" />;
      case 'error': return <XCircle size={14} className="text-red-400" />;
      case 'running': return <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />;
      default: return <Clock size={14} className="text-gray-600" />;
    }
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-4 gap-3">
        <div className="border border-gray-700 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Total Playbooks</div><div className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{playbooks.length}</div></div>
        <div className="border border-green-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Enabled</div><div className="text-2xl font-bold font-mono text-green-400">{playbooks.filter(p => p.enabled).length}</div></div>
        <div className="border border-blue-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Total Executions</div><div className="text-2xl font-bold font-mono text-blue-400">{playbooks.reduce((acc, p) => acc + p.run_count, 0)}</div></div>
        <div className="border border-yellow-800 rounded p-3" style={{ backgroundColor: 'var(--bg-surface)' }}><div className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Auto-Trigger</div><div className="text-2xl font-bold font-mono text-yellow-400">{playbooks.filter(p => p.trigger_type === 'alert').length}</div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel
          title="SOAR Playbooks"
          className="xl:col-span-2"
          actions={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Create Playbook
            </Button>
          }
        >
          <div className="divide-y">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4"><div className="h-5 bg-gray-700 rounded animate-pulse" /></div>
              ))
            ) : playbooks.map(pb => {
              const steps = (pb.steps as PlaybookStep[]) || [];
              const isRunning = executing === pb.id;
              return (
                <div key={pb.id} className={`p-4 hover:bg-gray-700/20 cursor-pointer ${selected?.id === pb.id ? 'bg-blue-900/10 border-l-2 border-blue-500' : ''}`}
                  onClick={() => setSelected(pb)}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pb.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{pb.description}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className={`text-xs px-2 py-0.5 rounded border ${pb.trigger_type === 'alert' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-gray-800 border-gray-700'}`} style={pb.trigger_type !== 'alert' ? { color: 'var(--text-muted)' } : undefined}>
                        {pb.trigger_type}
                      </span>
                      <button onClick={e => { e.stopPropagation(); togglePlaybook(pb.id, pb.enabled); }}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${pb.enabled ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-gray-800 border-gray-700'}`} style={!pb.enabled ? { color: 'var(--text-muted)', borderColor: 'var(--border)' } : undefined}>
                        {pb.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <Button
                        variant="secondary"
                        size="xs"
                        disabled={isRunning || !pb.enabled}
                        onClick={e => { e.stopPropagation(); executePlaybook(pb); }}
                      >
                        {isRunning ? <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" /> : <Play size={11} />}
                        {isRunning ? 'Running' : 'Run'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>{steps.length} steps</span>
                    <span>·</span>
                    <span>Run {pb.run_count}x</span>
                    {pb.last_run && <><span>·</span><span>Last: {timeAgo(pb.last_run)}</span></>}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-4">
          {selected && (
            <Panel title={`Steps: ${selected.name}`}>
              <div className="divide-y">
                {((selected.steps as PlaybookStep[]) || []).map((step, i) => {
                  const execStep = execSteps.find(s => s.order === step.order);
                  return (
                    <div key={i} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-xs flex-shrink-0" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{step.order}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-300">{step.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{step.action}</div>
                        {execStep && execStep.status !== 'pending' && (
                          <div className={`text-xs mt-1 ${execStep.status === 'success' ? 'text-green-400' : execStep.status === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                            {execStep.output}
                          </div>
                        )}
                      </div>
                      {execStep && (
                        <div className="flex-shrink-0">
                          {stepStatusIcon(execStep.status)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {execSteps.length > 0 && (
            <Panel title="Execution Log">
              <div className="p-3 space-y-2">
                {execSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {stepStatusIcon(step.status)}
                    <span style={{ color: 'var(--text-secondary)' }}>{step.name}</span>
                    {step.duration && <span className="text-gray-600 ml-auto">{step.duration}ms</span>}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Playbook">
        <div className="space-y-3">
          <Input label="Playbook Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Block Malicious IP" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="What does this playbook do?" />
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Trigger Type</label>
            <Select value={form.trigger_type} onChange={v => setForm(p => ({ ...p, trigger_type: v }))} options={[
              { value: 'manual', label: 'Manual' },
              { value: 'alert', label: 'Alert Triggered' },
              { value: 'schedule', label: 'Scheduled' },
            ]} />
          </div>
          <div className="text-xs text-gray-600 rounded p-3" style={{ backgroundColor: 'var(--bg-base)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)' }}>
            Steps can be added after creation through the playbook editor.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createPlaybook} disabled={saving || !form.name}>{saving ? 'Creating...' : 'Create Playbook'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
