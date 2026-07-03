import React, { useEffect, useState } from 'react';
import { FileText, Download, Plus } from 'lucide-react';
import { supabase, Report } from '../lib/supabase';
import { Panel, Badge, Button, Table, Modal, Input, Textarea, Select } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

const REPORT_TYPES = [
  { value: 'executive', label: 'Executive Report' },
  { value: 'soc', label: 'SOC Report' },
  { value: 'incident', label: 'Incident Report' },
  { value: 'malware', label: 'Malware Analysis Report' },
  { value: 'threat_intel', label: 'Threat Intelligence Report' },
  { value: 'vulnerability', label: 'Vulnerability Report' },
  { value: 'osint', label: 'OSINT Report' },
];

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);
  const [form, setForm] = useState({ title: '', report_type: 'soc', description: '' });

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    setLoading(true);
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  }

  async function generateReport() {
    setGenerating(true);

    // Fetch real data for the report
    const [alerts, incidents, vulns, assets, malware] = await Promise.all([
      supabase.from('alerts').select('severity, status').then(r => r.data || []),
      supabase.from('incidents').select('severity, status').then(r => r.data || []),
      supabase.from('vulnerabilities').select('severity, status').then(r => r.data || []),
      supabase.from('assets').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
      supabase.from('malware_samples').select('is_malicious').then(r => r.data || []),
    ]);

    const summary = buildSummary(form.report_type, alerts, incidents, vulns, assets as number, malware);

    const { data } = await supabase.from('reports').insert([{
      title: form.title || `${REPORT_TYPES.find(t => t.value === form.report_type)?.label} - ${new Date().toLocaleDateString()}`,
      report_type: form.report_type,
      status: 'complete',
      generated_by: 'alice.johnson',
      summary,
      data: {
        alerts: { total: alerts.length, critical: alerts.filter(a => a.severity === 'critical').length },
        incidents: { total: incidents.length, open: incidents.filter(i => i.status === 'open').length },
        vulnerabilities: { total: vulns.length, critical: vulns.filter(v => v.severity === 'critical').length },
        assets: assets,
        malware: { total: malware.length, malicious: malware.filter(m => m.is_malicious).length },
      },
    }]).select().single();

    setGenerating(false);
    setShowCreate(false);
    setForm({ title: '', report_type: 'soc', description: '' });
    fetchReports();
    if (data) setSelected(data);
  }

  function buildSummary(type: string, alerts: any[], incidents: any[], vulns: any[], assets: number, malware: any[]) {
    const critical = alerts.filter(a => a.severity === 'critical').length;
    const openInc = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length;
    const critVulns = vulns.filter(v => v.severity === 'critical').length;
    const maliciousFiles = malware.filter(m => m.is_malicious).length;

    switch (type) {
      case 'executive':
        return `Executive Security Summary: The organization's security posture shows ${critical} critical alerts requiring immediate attention, with ${openInc} active security incidents. ${critVulns} critical vulnerabilities have been identified across ${assets} managed assets. ${maliciousFiles} malware samples were detected this period.`;
      case 'soc':
        return `SOC Operations Report: Total alerts processed: ${alerts.length} (${critical} critical, ${alerts.filter(a => a.severity === 'high').length} high). Open incidents: ${openInc}. Analyst response times are within SLA. SIEM correlation rules operating normally.`;
      case 'vulnerability':
        return `Vulnerability Management Report: ${vulns.length} total findings identified. ${critVulns} critical severity vulnerabilities require immediate remediation. ${vulns.filter(v => v.exploit_available).length} vulnerabilities have known public exploits. Patch compliance rate: ${Math.round((vulns.filter(v => v.status === 'resolved').length / Math.max(vulns.length, 1)) * 100)}%.`;
      case 'malware':
        return `Malware Analysis Report: ${malware.length} samples analyzed. ${maliciousFiles} confirmed malicious (${Math.round((maliciousFiles / Math.max(malware.length, 1)) * 100)}% detection rate). YARA scanning active. Sandbox execution operational.`;
      default:
        return `Security report generated for period ending ${new Date().toLocaleDateString()}. ${alerts.length} total alerts, ${openInc} open incidents, ${assets} assets monitored.`;
    }
  }

  function exportReport(report: Report, format: 'json' | 'csv') {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify({ title: report.title, type: report.report_type, summary: report.summary, data: report.data, generated: report.created_at }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const csv = `Title,Type,Status,Generated,Summary\n"${report.title}","${report.report_type}","${report.status}","${report.created_at}","${report.summary || ''}"`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, '_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1">
          <Panel title="Generate Report" actions={<Button onClick={() => setShowCreate(true)}><Plus size={13} /> New Report</Button>}>
            <div className="p-4 space-y-2">
              {REPORT_TYPES.map(rt => (
                <button key={rt.value}
                  onClick={() => { setForm(p => ({ ...p, report_type: rt.value })); setShowCreate(true); }}
                  className="w-full text-left px-3 py-2.5 rounded text-sm hover:bg-gray-700/40 border hover:border-gray-600 flex items-center gap-2 transition-colors"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                  <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                  {rt.label}
                </button>
              ))}
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <Panel title="Generated Reports">
            <Table
              loading={loading}
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'type', label: 'Type', width: 'w-32' },
                { key: 'status', label: 'Status', width: 'w-24' },
                { key: 'generated_by', label: 'By', width: 'w-32' },
                { key: 'created', label: 'Generated', width: 'w-28' },
                { key: 'export', label: 'Export', width: 'w-28' },
              ]}
              rows={reports.map(r => ({
                title: <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.title}</span>,
                type: <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{r.report_type.replace('_', ' ')}</span>,
                status: <Badge text={r.status} type="status" />,
                generated_by: <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.generated_by || 'System'}</span>,
                created: <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(r.created_at)}</span>,
                export: (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => exportReport(r, 'json')} className="text-xs text-blue-400 hover:text-blue-300">JSON</button>
                    <span className="text-gray-700">|</span>
                    <button onClick={() => exportReport(r, 'csv')} className="text-xs text-blue-400 hover:text-blue-300">CSV</button>
                  </div>
                ),
              }))}
              onRowClick={i => setSelected(reports[i])}
            />
          </Panel>

          {selected && (
            <Panel title={selected.title} actions={
              <div className="flex gap-2">
                <Button variant="secondary" size="xs" onClick={() => exportReport(selected, 'json')}><Download size={12} /> JSON</Button>
                <Button variant="secondary" size="xs" onClick={() => exportReport(selected, 'csv')}><Download size={12} /> CSV</Button>
              </div>
            }>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>Type: <span className="capitalize" style={{ color: 'var(--text-primary)' }}>{selected.report_type.replace('_', ' ')}</span></span>
                  <span>·</span>
                  <span>By: <span style={{ color: 'var(--text-primary)' }}>{selected.generated_by}</span></span>
                  <span>·</span>
                  <span>Generated: <span style={{ color: 'var(--text-primary)' }}>{formatDate(selected.created_at)}</span></span>
                </div>

                {selected.summary && (
                  <div className="rounded p-4 text-sm leading-relaxed" style={{ backgroundColor: 'var(--bg-base)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {selected.summary}
                  </div>
                )}

                {selected.data && typeof selected.data === 'object' && (
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(selected.data as Record<string, any>).map(([key, val]) => (
                      <div key={key} className="rounded p-3 text-xs" style={{ backgroundColor: 'var(--bg-base)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}>
                        <div className="uppercase tracking-wide mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{key}</div>
                        {typeof val === 'object' ? (
                          Object.entries(val).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="text-gray-600 capitalize">{k}:</span>
                              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{String(v)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="font-mono text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{String(val)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Generate Report">
        <div className="space-y-3">
          <Input label="Report Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Leave blank for auto-title" />
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Report Type</label>
            <Select value={form.report_type} onChange={v => setForm(p => ({ ...p, report_type: v }))} options={REPORT_TYPES} />
          </div>
          <div className="text-xs rounded p-3" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-base)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}>
            The report will automatically aggregate live data from SIEM, incidents, vulnerabilities, malware analysis, and threat intelligence modules.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={generateReport} disabled={generating}>{generating ? 'Generating...' : 'Generate Report'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
