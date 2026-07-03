import React, { useState } from 'react';
import { Search, Globe, Mail, Phone, Hash, Building, User, AlertTriangle } from 'lucide-react';
import { supabase, OsintSearch } from '../lib/supabase';
import { Panel, Button, Badge, Table, Modal } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';

const QUERY_TYPES = [
  { value: 'ip', label: 'IP Address', icon: Globe, placeholder: '185.220.101.45' },
  { value: 'domain', label: 'Domain', icon: Globe, placeholder: 'example.com' },
  { value: 'email', label: 'Email', icon: Mail, placeholder: 'user@domain.com' },
  { value: 'username', label: 'Username', icon: User, placeholder: 'johndoe' },
  { value: 'hash', label: 'File Hash', icon: Hash, placeholder: 'MD5/SHA1/SHA256...' },
  { value: 'company', label: 'Company', icon: Building, placeholder: 'Acme Corp' },
  { value: 'phone', label: 'Phone', icon: Phone, placeholder: '+1-555-0100' },
];

interface OsintResult {
  whois?: any;
  geolocation?: any;
  dns_records?: any;
  subdomains?: string[];
  certificates?: number;
  open_ports?: number[];
  abuse_confidence?: number;
  reports_count?: number;
  reverse_dns?: string;
  breach_found?: boolean;
  domain_age_days?: number;
  typosquat?: boolean;
  original_domain?: string;
  shodan_data?: any;
}

export default function OSINT() {
  const [queryType, setQueryType] = useState('ip');
  const [queryValue, setQueryValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<OsintSearch | null>(null);
  const [history, setHistory] = useState<OsintSearch[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [selected, setSelected] = useState<OsintSearch | null>(null);

  React.useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const { data } = await supabase.from('osint_searches').select('*').order('created_at', { ascending: false }).limit(50);
    setHistory(data || []);
    setHistoryLoaded(true);
  }

  async function search() {
    if (!queryValue.trim()) return;
    setSearching(true);
    setResult(null);

    // Build simulated OSINT result based on type
    const q = queryValue.toLowerCase().trim();
    let results: OsintResult = {};
    let riskRating = 'low';

    if (queryType === 'ip') {
      const isTor = q.startsWith('185.220');
      const isInternal = q.startsWith('10.') || q.startsWith('192.168.') || q.startsWith('172.');
      results = {
        geolocation: isInternal
          ? { country: 'Internal', city: 'Private Network', lat: 0, lon: 0 }
          : { country: isTor ? 'Germany' : 'United States', city: isTor ? 'Frankfurt' : 'Ashburn', lat: isTor ? 50.11 : 39.01, lon: isTor ? 8.68 : -77.48 },
        whois: { org: isTor ? 'Tor Project' : 'ARIN', country: isTor ? 'DE' : 'US' },
        open_ports: isTor ? [9001, 9030, 443] : [80, 443, 22],
        reverse_dns: q + '.in-addr.arpa',
        abuse_confidence: isTor ? 98 : 5,
        reports_count: isTor ? 145 : 0,
      };
      riskRating = isTor ? 'critical' : isInternal ? 'info' : 'low';
    } else if (queryType === 'domain') {
      const isSuspicious = q.includes('evil') || q.includes('malware') || q.includes('fake');
      results = {
        whois: { registrar: isSuspicious ? 'NameSilo' : 'GoDaddy', created: '2024-01-01', country: isSuspicious ? 'RU' : 'US' },
        dns_records: { A: ['198.51.100.1'], MX: isSuspicious ? [] : ['mail.' + q], NS: ['ns1.' + q] },
        subdomains: ['www.' + q, 'mail.' + q, 'api.' + q],
        certificates: Math.floor(Math.random() * 5) + 1,
      };
      riskRating = isSuspicious ? 'high' : 'low';
    } else if (queryType === 'email') {
      const isDomainSuspicious = q.includes('fake') || q.includes('phish');
      results = {
        breach_found: isDomainSuspicious,
        domain_age_days: isDomainSuspicious ? 15 : 3650,
        typosquat: isDomainSuspicious,
        original_domain: isDomainSuspicious ? 'microsoft.com' : undefined,
      };
      riskRating = isDomainSuspicious ? 'high' : 'low';
    } else {
      results = {
        whois: { info: `OSINT search for ${queryType}: ${queryValue}` },
      };
    }

    await new Promise(r => setTimeout(r, 800));

    const { data } = await supabase.from('osint_searches').insert([{
      query_type: queryType,
      query_value: queryValue,
      results,
      risk_rating: riskRating,
      status: 'complete',
      analyst: 'alice.johnson',
    }]).select().single();

    if (data) {
      setResult(data);
      loadHistory();
    }
    setSearching(false);
  }

  const currentType = QUERY_TYPES.find(t => t.value === queryType)!;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Search Panel */}
        <div className="xl:col-span-1 space-y-4">
          <Panel title="OSINT Search">
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Query Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUERY_TYPES.map(t => {
                    const Icon = t.icon;
                    return (
                      <button key={t.value} onClick={() => setQueryType(t.value)}
                        className={`flex items-center gap-2 px-2 py-2 rounded text-xs border transition-colors ${queryType === t.value ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-800 hover:border-gray-600'}`}
                        style={queryType !== t.value ? { color: 'var(--text-secondary)', borderColor: 'var(--border)' } : undefined}>
                        <Icon size={12} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Search Value</label>
                <input
                  value={queryValue}
                  onChange={e => setQueryValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  placeholder={currentType.placeholder}
                  className="w-full border rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <Button onClick={search} disabled={searching || !queryValue.trim()} className="w-full justify-center">
                <Search size={14} />
                {searching ? 'Gathering Intelligence...' : 'Start OSINT Search'}
              </Button>
            </div>
          </Panel>

          {/* Search History */}
          <Panel title="Search History">
            <div className="divide-y max-h-80 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-4 text-xs text-gray-600">No searches yet.</div>
              ) : history.map(h => (
                <button key={h.id} onClick={() => setSelected(h)}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-700/30 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-gray-300 font-mono">{h.query_value}</div>
                    <div className="text-xs text-gray-600">{h.query_type} · {timeAgo(h.created_at)}</div>
                  </div>
                  {h.risk_rating && <Badge text={h.risk_rating} type="severity" />}
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-2">
          {searching && (
            <Panel title="Gathering Intelligence...">
              <div className="p-8 text-center">
                <div className="animate-spin w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Running OSINT modules...</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>WHOIS · DNS · GeoIP · ASN · Threat Feeds · Shodan</div>
              </div>
            </Panel>
          )}

          {result && !searching && <OsintResultView result={result} />}
          {!result && !searching && selected && <OsintResultView result={selected} />}

          {!result && !searching && !selected && (
            <Panel title="Intelligence Workspace">
              <div className="p-12 text-center text-gray-600">
                <Globe size={36} className="mx-auto mb-3 text-gray-700" />
                <div className="text-sm">Select a query type and enter a value to begin OSINT collection.</div>
                <div className="text-xs mt-2">Supported: IP, Domain, Email, Username, Hash, Company, Phone</div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function OsintResultView({ result }: { result: OsintSearch }) {
  const data = result.results as any;

  return (
    <div className="space-y-3">
      <Panel title={`OSINT Report: ${result.query_value}`}>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Query</div>
              <div className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{result.query_value}</div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Type</div>
              <div className="text-sm text-gray-300 uppercase">{result.query_type}</div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Risk Rating</div>
              {result.risk_rating && <Badge text={result.risk_rating} type="severity" />}
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Analyst</div>
              <div className="text-sm text-gray-300">{result.analyst || 'System'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {data?.geolocation && (
              <div className="rounded border p-3" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>Geolocation</div>
                <div className="space-y-1 text-xs">
                  <div><span style={{ color: 'var(--text-muted)' }}>Country:</span> <span className="text-gray-300">{data.geolocation.country}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>City:</span> <span className="text-gray-300">{data.geolocation.city}</span></div>
                  {data.geolocation.lat !== undefined && (
                    <div><span style={{ color: 'var(--text-muted)' }}>Coords:</span> <span className="text-gray-300 font-mono">{data.geolocation.lat}, {data.geolocation.lon}</span></div>
                  )}
                </div>
              </div>
            )}

            {data?.whois && (
              <div className="rounded border p-3" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>WHOIS</div>
                <div className="space-y-1 text-xs">
                  {Object.entries(data.whois).map(([k, v]) => (
                    <div key={k}><span className="capitalize" style={{ color: 'var(--text-muted)' }}>{k}:</span> <span className="text-gray-300">{String(v)}</span></div>
                  ))}
                </div>
              </div>
            )}

            {data?.open_ports && (
              <div className="rounded border p-3" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>Open Ports</div>
                <div className="flex flex-wrap gap-1">
                  {data.open_ports.map((p: number) => (
                    <span key={p} className="bg-blue-900/30 text-blue-300 border border-blue-800 px-2 py-0.5 rounded text-xs font-mono">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {data?.dns_records && (
              <div className="rounded border p-3" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>DNS Records</div>
                <div className="space-y-1 text-xs">
                  {Object.entries(data.dns_records).map(([type, records]) => (
                    <div key={type}><span style={{ color: 'var(--text-muted)' }}>{type}:</span> <span className="text-gray-300 font-mono">{Array.isArray(records) ? records.join(', ') || '-' : String(records)}</span></div>
                  ))}
                </div>
              </div>
            )}

            {data?.abuse_confidence !== undefined && (
              <div className={`rounded border p-3 ${data.abuse_confidence > 50 ? 'border-red-800' : ''}`} style={{ backgroundColor: 'var(--bg-base)', borderColor: data.abuse_confidence > 50 ? undefined : 'var(--border)' }}>
                <div className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>AbuseIPDB</div>
                <div className="text-2xl font-bold font-mono mb-1">
                  <span className={data.abuse_confidence > 50 ? 'text-red-400' : 'text-green-400'}>{data.abuse_confidence}%</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Confidence of Abuse</div>
                {data.reports_count !== undefined && (
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{data.reports_count} reports submitted</div>
                )}
              </div>
            )}

            {data?.subdomains && data.subdomains.length > 0 && (
              <div className="rounded border p-3" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>Subdomains ({data.subdomains.length})</div>
                <div className="space-y-0.5">
                  {data.subdomains.map((s: string) => (
                    <div key={s} className="text-xs text-blue-400 font-mono">{s}</div>
                  ))}
                </div>
              </div>
            )}

            {data?.breach_found !== undefined && (
              <div className={`rounded border p-3 ${data.breach_found ? 'border-red-800' : 'border-green-800'}`} style={{ backgroundColor: 'var(--bg-base)' }}>
                <div className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>Breach Database</div>
                <div className={`text-sm font-bold ${data.breach_found ? 'text-red-400' : 'text-green-400'}`}>
                  {data.breach_found ? 'BREACH FOUND' : 'NOT FOUND IN BREACHES'}
                </div>
                {data.domain_age_days !== undefined && (
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Domain age: {data.domain_age_days} days</div>
                )}
                {data.typosquat && (
                  <div className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                    <AlertTriangle size={10} /> Typosquatting detected (similar to {data.original_domain})
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Search completed: {formatDate(result.created_at)}</div>
        </div>
      </Panel>
    </div>
  );
}
