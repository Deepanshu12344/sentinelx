import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building, Copy, ExternalLink, Globe, Hash, Mail, Phone, Search, Trash2, User } from 'lucide-react';
import { supabase, OsintSearch } from '../lib/supabase';
import { Badge, Button, Modal, Panel } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

const QUERY_TYPES = [
  { value: 'ip', label: 'IP Address', icon: Globe, placeholder: '8.8.8.8' },
  { value: 'domain', label: 'Domain', icon: Globe, placeholder: 'example.com' },
  { value: 'email', label: 'Email', icon: Mail, placeholder: 'user@example.com' },
  { value: 'username', label: 'Username', icon: User, placeholder: 'johndoe' },
  { value: 'hash', label: 'File Hash', icon: Hash, placeholder: 'MD5, SHA-1, or SHA-256' },
  { value: 'company', label: 'Company', icon: Building, placeholder: 'Acme Corporation' },
  { value: 'phone', label: 'Phone', icon: Phone, placeholder: '+1 555 010 1234' },
] as const;

type QueryType = typeof QUERY_TYPES[number]['value'];
type RecordValue = string | number | boolean | null | string[] | Record<string, unknown>;
type SourceResult = { name: string; url: string; status: 'complete' | 'unavailable' | 'not_applicable'; collected_at: string; detail?: string; linkable?: boolean };
type VirusTotalEngine = { engine: string; category: string; result: string | null; method: string | null; engine_version: string | null; engine_update: string | null };
type VirusTotalReport = { found: boolean; sha256: string | null; meaningful_name: string | null; type_description: string | null; size: number | null; reputation: number; last_analysis_date: string | null; first_submission_date: string | null; last_submission_date: string | null; detections: { malicious: number; suspicious: number; harmless: number; undetected: number; total: number }; tags: string[]; names: string[]; engines: VirusTotalEngine[] };
type OsintPayload = {
  normalized: string;
  collected_at: string;
  summary: string[];
  evidence: Record<string, RecordValue>;
  sources: SourceResult[];
  correlation: { matches: number; indicators: string[] };
  limitations: string[];
  virustotal?: VirusTotalReport;
};

const publicSource = (name: string, url: string, status: SourceResult['status'], detail?: string): SourceResult => ({
  name, url, status, detail, collected_at: new Date().toISOString(),
});

export default function OSINT() {
  const [queryType, setQueryType] = useState<QueryType>('ip');
  const [queryValue, setQueryValue] = useState('');
  const [notes, setNotes] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OsintSearch | null>(null);
  const [history, setHistory] = useState<OsintSearch[]>([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [selected, setSelected] = useState<OsintSearch | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<OsintSearch | null>(null);

  useEffect(() => { void loadHistory(); }, []);

  async function loadHistory() {
    const { data, error: historyError } = await supabase.from('osint_searches').select('*').order('created_at', { ascending: false }).limit(100);
    if (historyError) setError(historyError.message);
    setHistory(data || []);
  }

  async function search() {
    const normalized = normalizeQuery(queryType, queryValue);
    if ('error' in normalized) {
      setError(normalized.error);
      return;
    }

    setError(null);
    setSearching(true);
    setResult(null);
    setSelected(null);
    try {
      const payload = await collectOsint(queryType, normalized.value);
      const { data, error: insertError } = await supabase.from('osint_searches').insert([{
        query_type: queryType,
        query_value: normalized.value,
        results: payload,
        risk_rating: rateRisk(payload),
        status: 'complete',
        analyst: 'Analyst',
        notes: notes.trim() || null,
      }]).select().single();
      if (insertError) throw insertError;
      setResult(data);
      setNotes('');
      await loadHistory();
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'OSINT collection failed.');
    } finally {
      setSearching(false);
    }
  }

  async function deleteSearch(search: OsintSearch) {
    setDeletingId(search.id);
    setError(null);
    try {
      // Request the deleted row back. With RLS, Supabase can otherwise report a
      // successful no-op when the caller has no DELETE policy for this row.
      const { data: deleted, error: deleteError } = await supabase.from('osint_searches').delete().eq('id', search.id).select('id').maybeSingle();
      if (deleteError) throw deleteError;
      if (!deleted) throw new Error('This investigation was not deleted. Check that your account has permission to delete OSINT investigations.');
      setHistory(items => items.filter(item => item.id !== search.id));
      setResult(current => current?.id === search.id ? null : current);
      setSelected(current => current?.id === search.id ? null : current);
      setDeleteCandidate(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete the investigation.');
    } finally {
      setDeletingId(null);
    }
  }

  function requestDelete(search: OsintSearch) {
    setError(null);
    setDeleteCandidate(search);
  }

  const currentType = QUERY_TYPES.find(type => type.value === queryType)!;
  const filteredHistory = useMemo(() => history.filter(item => `${item.query_type} ${item.query_value}`.toLowerCase().includes(historyFilter.toLowerCase())), [history, historyFilter]);
  const visibleResult = result || selected;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 space-y-4">
          <Panel title="OSINT Investigation">
            <div className="p-4 space-y-3">
              {error && <div className="rounded border border-red-800 bg-red-900/20 p-3 text-xs text-red-300">{error}</div>}
              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Indicator type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUERY_TYPES.map(type => {
                    const Icon = type.icon;
                    return <button key={type.value} type="button" onClick={() => setQueryType(type.value)} className={`flex items-center gap-2 px-2 py-2 rounded text-xs border transition-colors ${queryType === type.value ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-800 hover:border-gray-600'}`} style={queryType !== type.value ? { color: 'var(--text-secondary)', borderColor: 'var(--border)' } : undefined}><Icon size={12} />{type.label}</button>;
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Indicator value</label>
                <input value={queryValue} onChange={event => setQueryValue(event.target.value)} onKeyDown={event => event.key === 'Enter' && void search()} placeholder={currentType.placeholder} className="w-full border rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Investigation note <span className="text-gray-600">(optional)</span></label>
                <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder="Case reference, purpose, handling caveat…" className="w-full border rounded px-3 py-2 text-sm resize-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <Button onClick={() => void search()} disabled={searching || !queryValue.trim()} className="w-full justify-center"><Search size={14} />{searching ? 'Collecting evidence…' : 'Run investigation'}</Button>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>Collection uses public, passive sources only. Results retain source provenance and collection time; unavailable sources are reported, never simulated.</p>
            </div>
          </Panel>

          <Panel title="Investigation History">
            <div className="p-3 border-b" style={{ borderColor: 'var(--border-soft)' }}><input value={historyFilter} onChange={event => setHistoryFilter(event.target.value)} placeholder="Filter history…" className="w-full border rounded px-2 py-1.5 text-xs" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} /></div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {filteredHistory.length === 0 ? <div className="p-4 text-xs text-gray-600">No saved investigations.</div> : filteredHistory.map(item => <div key={item.id} className="px-4 py-2.5 hover:bg-gray-700/30 flex items-start gap-2"><button type="button" onClick={() => { setSelected(item); setResult(null); }} className="min-w-0 flex-1 text-left"><div className="text-xs text-gray-300 font-mono truncate">{item.query_value}</div><div className="text-xs text-gray-600">{item.query_type} · {timeAgo(item.created_at)}</div></button>{item.risk_rating && <Badge text={item.risk_rating} type="severity" />}<button type="button" title="Delete investigation" aria-label={`Delete ${item.query_value}`} disabled={deletingId === item.id} onClick={() => requestDelete(item)} className="p-1 text-red-400 hover:bg-red-900/30 rounded disabled:opacity-40"><Trash2 size={14} /></button></div>)}
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-2">
          {searching && <CollectionProgress />}
          {!searching && visibleResult && <OsintResultView result={visibleResult} onDelete={requestDelete} deleting={deletingId === visibleResult.id} />}
          {!searching && !visibleResult && <EmptyWorkspace />}
        </div>
      </div>
      <Modal open={!!deleteCandidate} onClose={() => { if (!deletingId) setDeleteCandidate(null); }} title="Delete OSINT investigation" width="max-w-md">
        <div className="space-y-4"><p className="text-sm text-gray-300">Permanently delete the saved investigation for <span className="font-mono">{deleteCandidate?.query_value}</span>?</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>This removes the saved report and its source findings.</p><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteCandidate(null)} disabled={!!deletingId}>Cancel</Button><Button variant="danger" onClick={() => deleteCandidate && void deleteSearch(deleteCandidate)} disabled={!!deletingId}><Trash2 size={14} />{deletingId ? 'Deleting…' : 'Delete entry'}</Button></div></div>
      </Modal>
    </div>
  );
}

function CollectionProgress() {
  return <Panel title="Collecting Evidence"><div className="p-10 text-center"><div className="animate-spin w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" /><div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Querying passive intelligence sources…</div><div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>RDAP · DNS-over-HTTPS · Certificate Transparency · Local IOC correlation</div></div></Panel>;
}

function EmptyWorkspace() {
  return <Panel title="Intelligence Workspace"><div className="p-12 text-center text-gray-600"><Globe size={36} className="mx-auto mb-3 text-gray-700" /><div className="text-sm">Start an investigation to collect attributable public evidence.</div><div className="text-xs mt-2">No active scanning, credential checks, breach claims, or fabricated enrichment.</div></div></Panel>;
}

function OsintResultView({ result, onDelete, deleting }: { result: OsintSearch; onDelete: (search: OsintSearch) => void; deleting: boolean }) {
  const payload = result.results as unknown as OsintPayload;
  const copy = async () => { await navigator.clipboard.writeText(result.query_value); };
  return <div className="space-y-3">
    <Panel title={`OSINT Report: ${result.query_value}`}>
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-4 pb-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="flex-1 min-w-48"><div className="text-xs" style={{ color: 'var(--text-muted)' }}>Normalized indicator</div><div className="flex items-center gap-2 text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{payload.normalized || result.query_value}<button type="button" aria-label="Copy indicator" onClick={() => void copy()} className="text-gray-500 hover:text-blue-400"><Copy size={14} /></button></div></div>
          <Metric label="Type" value={result.query_type.toUpperCase()} />
          <div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>Risk rating</div>{result.risk_rating && <Badge text={result.risk_rating} type="severity" />}</div>
          <Metric label="Status" value={result.status} />
          <button type="button" onClick={() => onDelete(result)} disabled={deleting} className="ml-auto inline-flex items-center gap-1 rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-900/30 disabled:opacity-40"><Trash2 size={13} />{deleting ? 'Deleting…' : 'Delete entry'}</button>
        </div>
        {result.notes && <div className="rounded border p-3 text-xs" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)' }}><span style={{ color: 'var(--text-muted)' }}>Investigation note: </span><span className="text-gray-300">{result.notes}</span></div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><EvidenceCard title="Assessment" data={{ Summary: payload.summary || [], 'Threat-intel matches': payload.correlation?.matches ?? 0, 'Matching indicators': payload.correlation?.indicators || [] }} /><EvidenceCard title="Collected Evidence" data={payload.evidence || {}} /></div>
        {payload.virustotal?.found && <VirusTotalFindings report={payload.virustotal} />}
        <div className="rounded border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)' }}><div className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>Source Provenance</div><div className="space-y-2">{(payload.sources || []).map(source => <div key={`${source.name}-${source.url}`} className="flex flex-wrap items-center gap-2 text-xs">{source.linkable === false ? <span className="text-gray-300">{source.name}</span> : <a href={source.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">{source.name}<ExternalLink size={11} /></a>}<Badge text={source.status} type="status" />{source.detail && <span style={{ color: 'var(--text-muted)' }}>{source.detail}</span>}<span className="ml-auto" style={{ color: 'var(--text-muted)' }}>{formatDate(source.collected_at)}</span></div>)}</div></div>
        {payload.limitations?.length > 0 && <div className="flex gap-2 rounded border border-yellow-800 bg-yellow-900/10 p-3 text-xs text-yellow-200"><AlertTriangle size={15} className="shrink-0" />{payload.limitations.join(' ')}</div>}
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Saved: {formatDate(result.created_at)} · Results are point-in-time public-source evidence, not a determination of maliciousness.</div>
      </div>
    </Panel>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div><div className="text-sm text-gray-300">{value}</div></div>; }
function VirusTotalFindings({ report }: { report: VirusTotalReport }) {
  const [filter, setFilter] = useState<'all' | 'detected'>('all');
  const engines = filter === 'detected' ? report.engines.filter(engine => engine.category === 'malicious' || engine.category === 'suspicious') : report.engines;
  return <div className="rounded border p-3 space-y-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)' }}>
    <div className="flex flex-wrap items-center gap-3"><div><div className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>VirusTotal Findings</div><div className="text-xs text-gray-500 mt-1">Rendered in SentinelX from the VirusTotal API; no redirect required.</div></div><div className="ml-auto flex gap-1"><button type="button" onClick={() => setFilter('all')} className={`rounded px-2 py-1 text-xs ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>All ({report.engines.length})</button><button type="button" onClick={() => setFilter('detected')} className={`rounded px-2 py-1 text-xs ${filter === 'detected' ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Detected ({report.detections.malicious + report.detections.suspicious})</button></div></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><Metric label="Malicious" value={String(report.detections.malicious)} /><Metric label="Suspicious" value={String(report.detections.suspicious)} /><Metric label="Undetected" value={String(report.detections.undetected)} /><Metric label="Total engines" value={String(report.detections.total)} /></div>
    <div className="max-h-96 overflow-auto rounded border" style={{ borderColor: 'var(--border-soft)' }}><table className="w-full text-xs"><thead className="sticky top-0 bg-gray-900 text-left" style={{ color: 'var(--text-muted)' }}><tr><th className="p-2 font-medium">Engine</th><th className="p-2 font-medium">Verdict</th><th className="p-2 font-medium">Detection</th><th className="p-2 font-medium">Method</th><th className="p-2 font-medium">Updated</th></tr></thead><tbody>{engines.map(engine => <tr key={engine.engine} className="border-t" style={{ borderColor: 'var(--border-soft)' }}><td className="p-2 text-gray-300">{engine.engine}</td><td className={`p-2 ${engine.category === 'malicious' ? 'text-red-400' : engine.category === 'suspicious' ? 'text-yellow-300' : 'text-gray-400'}`}>{engine.category}</td><td className="p-2 font-mono text-gray-300">{engine.result || '—'}</td><td className="p-2 text-gray-400">{engine.method || '—'}</td><td className="p-2 text-gray-500">{engine.engine_update || '—'}</td></tr>)}</tbody></table></div>
  </div>;
}
function EvidenceCard({ title, data }: { title: string; data: Record<string, RecordValue> }) { return <div className="rounded border p-3" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}><div className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{title}</div><div className="space-y-2 text-xs">{Object.entries(data).length === 0 ? <span style={{ color: 'var(--text-muted)' }}>No evidence returned.</span> : Object.entries(data).map(([key, value]) => <div key={key}><span className="capitalize" style={{ color: 'var(--text-muted)' }}>{key.replace(/_/g, ' ')}: </span><span className="text-gray-300 font-mono break-all">{formatEvidence(value)}</span></div>)}</div></div>; }
function formatEvidence(value: RecordValue) { return Array.isArray(value) ? (value.length ? value.join(', ') : 'None') : typeof value === 'object' && value ? JSON.stringify(value) : String(value ?? 'Unknown'); }

function normalizeQuery(type: QueryType, input: string): { value: string } | { error: string } {
  const value = input.trim();
  if (!value) return { error: 'Enter an indicator value.' };
  if (type === 'ip') { if (!isIp(value)) return { error: 'Enter a valid IPv4 or IPv6 address.' }; return { value: value.toLowerCase() }; }
  if (type === 'domain') { const domain = value.replace(/^https?:\/\//i, '').split('/')[0].replace(/\.$/, '').toLowerCase(); if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) return { error: 'Enter a valid fully qualified domain name.' }; return { value: domain }; }
  if (type === 'email') { const email = value.toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' }; return { value: email }; }
  if (type === 'hash') { const hash = value.replace(/\s/g, '').toLowerCase(); if (![32, 40, 64].includes(hash.length) || !/^[a-f0-9]+$/.test(hash)) return { error: 'Enter a valid MD5, SHA-1, or SHA-256 hash.' }; return { value: hash }; }
  if (type === 'username' && !/^[\w.-]{2,64}$/.test(value)) return { error: 'Usernames may contain 2–64 letters, numbers, dots, underscores, or hyphens.' };
  if (type === 'phone' && !/^\+?[0-9().\s-]{7,25}$/.test(value)) return { error: 'Enter a valid phone number.' };
  return { value: type === 'company' ? value.replace(/\s+/g, ' ') : value };
}

function isIp(value: string) { const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(value); return ipv4 || (/^[0-9a-f:]+$/i.test(value) && value.includes(':')); }

async function collectOsint(type: QueryType, value: string): Promise<OsintPayload> {
  const startedAt = new Date().toISOString();
  const sources: SourceResult[] = [];
  const evidence: Record<string, RecordValue> = { query_type: type };
  const limitations: string[] = [];
  let virustotal: VirusTotalReport | undefined;
  const correlation = await correlateIndicator(value);
  if (type === 'ip') {
    const [rdap, geo] = await Promise.all([fetchJson(`https://rdap.org/ip/${encodeURIComponent(value)}`), fetchJson(`https://ipwho.is/${encodeURIComponent(value)}`)]);
    sources.push(sourceFrom('RDAP IP registry', `https://rdap.org/ip/${encodeURIComponent(value)}`, rdap), sourceFrom('IPWhois geolocation', `https://ipwho.is/${encodeURIComponent(value)}`, geo));
    if (rdap.data) evidence.rdap = pickRdap(rdap.data); if (geo.data?.success !== false) evidence.geolocation = pickGeo(geo.data);
  } else if (type === 'domain' || type === 'email') {
    const domain = type === 'email' ? value.split('@')[1] : value;
    const certificateUrl = `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names`;
    const [rdap, dns, certificates] = await Promise.all([fetchJson(`https://rdap.org/domain/${encodeURIComponent(domain)}`), fetchDns(domain), fetchJson(certificateUrl)]);
    sources.push(sourceFrom('RDAP domain registry', `https://rdap.org/domain/${encodeURIComponent(domain)}`, rdap), ...dns.sources, sourceFrom('Certificate Transparency (Cert Spotter)', certificateUrl, certificates));
    if (rdap.data) evidence.rdap = pickRdap(rdap.data); evidence.dns = dns.records; if (Array.isArray(certificates.data)) evidence.certificate_names = Array.from(new Set(certificates.data.flatMap((entry: { dns_names?: string[] }) => entry.dns_names || []).filter((name: string) => name === domain || name.endsWith(`.${domain}`)))).slice(0, 100);
  } else if (type === 'hash') {
    evidence.hash_algorithm = value.length === 32 ? 'MD5' : value.length === 40 ? 'SHA-1' : 'SHA-256';
    const vtUrl = `https://www.virustotal.com/gui/search/${value}`;
    const vt = await fetchVirusTotal(value);
    const source = sourceFrom('VirusTotal reputation', vtUrl, vt);
    source.linkable = false;
    sources.push(source);
    const report = asRecord(vt.data) as unknown as VirusTotalReport;
    if (report.found === true) {
      virustotal = report;
      evidence.virustotal_summary = { detections: report.detections, meaningful_name: report.meaningful_name, type_description: report.type_description, tags: report.tags };
    } else if (report.found === false) {
      limitations.push('VirusTotal has no report for this hash. This is not a clean verdict.');
    } else if (vt.error) {
      limitations.push(`VirusTotal reputation was not collected: ${vt.error}. Review the VirusTotal source entry before drawing conclusions.`);
    }
  } else {
    const queryUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${value}"`)}`;
    sources.push(publicSource('Manual web research', queryUrl, 'not_applicable', 'Open the source to conduct a human-reviewed search.'));
    limitations.push(`${type[0].toUpperCase() + type.slice(1)} research requires analyst review and approved data providers; this application does not scrape social, breach, or people-search sites.`);
  }
  if (sources.some(source => source.status === 'unavailable')) limitations.push('One or more public sources were unavailable or blocked by the browser. Review the source entries before drawing conclusions.');
  const summary = [`Collected ${sources.filter(source => source.status === 'complete').length} public-source result${sources.filter(source => source.status === 'complete').length === 1 ? '' : 's'}.`, correlation.matches ? `Found ${correlation.matches} local threat-intelligence correlation${correlation.matches === 1 ? '' : 's'}.` : 'No exact local threat-intelligence correlation found.'];
  return { normalized: value, collected_at: startedAt, summary, evidence, sources, correlation, limitations, virustotal };
}

async function correlateIndicator(value: string) { const { data, error } = await supabase.from('threat_intel').select('indicator_value').ilike('indicator_value', value).limit(25); return { matches: error ? 0 : (data || []).length, indicators: (data || []).map(item => item.indicator_value) }; }
async function fetchJson(url: string) { try { const response = await fetch(url, { headers: { Accept: 'application/json' } }); if (!response.ok) return { error: `HTTP ${response.status}` }; return { data: await response.json() }; } catch (error) { return { error: error instanceof Error ? error.message : 'Network error' }; } }
async function fetchVirusTotal(hash: string) {
  const configuredUrl = import.meta.env.VITE_OSINT_API_URL;
  const baseUrl = configuredUrl || (import.meta.env.DEV ? 'http://127.0.0.1:8787' : '');
  if (!baseUrl) return { error: 'No OSINT server URL is configured.' };
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/osint/hash`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hash }) });
    const data = await response.json();
    return response.ok ? { data } : { error: typeof data?.error === 'string' ? data.error : `HTTP ${response.status}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'OSINT server is unavailable.' };
  }
}
function sourceFrom(name: string, url: string, response: { data?: unknown; error?: string }): SourceResult { return publicSource(name, url, response.data ? 'complete' : 'unavailable', response.error); }
async function fetchDns(domain: string) { const types = ['A', 'AAAA', 'MX', 'NS', 'TXT']; const responses = await Promise.all(types.map(async type => [type, await fetchJson(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`)] as const)); const records: Record<string, string[]> = {}; const sources: SourceResult[] = []; responses.forEach(([type, response]) => { const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`; sources.push(sourceFrom(`Google DNS-over-HTTPS (${type})`, url, response)); records[type] = Array.isArray((response.data as { Answer?: { data?: string }[] } | undefined)?.Answer) ? ((response.data as { Answer: { data?: string }[] }).Answer.map(answer => answer.data || '').filter(Boolean)) : []; }); return { records, sources }; }
function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function textValue(value: unknown) { return typeof value === 'string' || typeof value === 'number' ? String(value) : null; }
function pickRdap(data: unknown) {
  const record = asRecord(data);
  const events = Array.isArray(record.events) ? record.events.map(asRecord).filter(event => ['registration', 'last changed', 'expiration'].includes(String(event.eventAction))).map(event => `${event.eventAction}: ${event.eventDate}`) : [];
  return { handle: textValue(record.handle), name: textValue(record.name), country: textValue(record.country), start_address: textValue(record.startAddress), end_address: textValue(record.endAddress), events };
}
function pickGeo(data: unknown) {
  const record = asRecord(data);
  const connection = asRecord(record.connection);
  return { country: textValue(record.country), region: textValue(record.region), city: textValue(record.city), asn: textValue(connection.asn), isp: textValue(connection.isp), latitude: textValue(record.latitude), longitude: textValue(record.longitude) };
}
function rateRisk(payload: OsintPayload) { if (payload.correlation.matches > 0) return 'high'; if (payload.sources.some(source => source.status === 'unavailable')) return 'info'; return 'low'; }
