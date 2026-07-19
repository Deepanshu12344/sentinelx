import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// Local development convenience. Production deployments should inject secrets
// through their platform's secret manager instead of relying on a .env file.
async function loadDotEnv() {
  try {
    const content = await readFile('.env', 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

await loadDotEnv();

const port = Number(process.env.OSINT_SERVER_PORT || 8787);
const host = process.env.OSINT_SERVER_HOST || '127.0.0.1';
const allowedOrigins = (process.env.OSINT_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value => value.trim());
const vtApiKey = process.env.VT_API_KEY?.trim();
const requests = new Map();

function isAllowedOrigin(origin) {
  if (allowedOrigins.includes(origin)) return true;
  // Vite may choose the next available port during local development. Keep
  // this convenience limited to loopback origins; deployments must be listed.
  return process.env.NODE_ENV !== 'production' && /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin);
}

function send(response, status, body, origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (origin && isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin;
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}

function isRateLimited(address) {
  const now = Date.now();
  const recent = (requests.get(address) || []).filter(timestamp => now - timestamp < 60_000);
  recent.push(now);
  requests.set(address, recent);
  return recent.length > 20;
}

function isHash(value) {
  return typeof value === 'string' && [32, 40, 64].includes(value.length) && /^[a-f0-9]+$/i.test(value);
}

function compactReport(attributes) {
  const stats = attributes.last_analysis_stats || {};
  const engineFindings = Object.entries(attributes.last_analysis_results || {}).map(([engine, finding]) => {
    const result = finding && typeof finding === 'object' ? finding : {};
    return {
      engine,
      category: typeof result.category === 'string' ? result.category : 'undetected',
      result: typeof result.result === 'string' ? result.result : null,
      method: typeof result.method === 'string' ? result.method : null,
      engine_version: typeof result.engine_version === 'string' ? result.engine_version : null,
      engine_update: typeof result.engine_update === 'string' ? result.engine_update : null,
    };
  }).sort((left, right) => left.category.localeCompare(right.category) || left.engine.localeCompare(right.engine));
  return {
    found: true,
    sha256: attributes.sha256 || null,
    meaningful_name: attributes.meaningful_name || null,
    type_description: attributes.type_description || null,
    size: attributes.size || null,
    reputation: attributes.reputation || 0,
    last_analysis_date: attributes.last_analysis_date ? new Date(attributes.last_analysis_date * 1000).toISOString() : null,
    first_submission_date: attributes.first_submission_date ? new Date(attributes.first_submission_date * 1000).toISOString() : null,
    last_submission_date: attributes.last_submission_date ? new Date(attributes.last_submission_date * 1000).toISOString() : null,
    detections: {
      malicious: Number(stats.malicious || 0),
      suspicious: Number(stats.suspicious || 0),
      harmless: Number(stats.harmless || 0),
      undetected: Number(stats.undetected || 0),
      total: Object.values(stats).reduce((total, value) => total + Number(value || 0), 0),
    },
    tags: Array.isArray(attributes.tags) ? attributes.tags.slice(0, 30) : [],
    names: Array.isArray(attributes.names) ? attributes.names.slice(0, 100) : [],
    engines: engineFindings,
  };
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (request.method === 'OPTIONS') {
    if (!origin || !isAllowedOrigin(origin)) return send(response, 403, { error: 'Origin is not allowed.' }, origin);
    response.writeHead(204, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' });
    return response.end();
  }
  if (!origin || !isAllowedOrigin(origin)) return send(response, 403, { error: 'Origin is not allowed.' }, origin);
  if (request.method === 'GET' && request.url === '/api/osint/health') {
    return send(response, 200, { service: 'osint', status: 'ready', virustotal_configured: Boolean(vtApiKey) }, origin);
  }
  if (request.method !== 'POST' || request.url !== '/api/osint/hash') return send(response, 404, { error: 'Not found.' }, origin);
  if (isRateLimited(request.socket.remoteAddress || 'unknown')) return send(response, 429, { error: 'Too many requests. Try again shortly.' }, origin);
  if (!vtApiKey) return send(response, 503, { error: 'VirusTotal is not configured on the OSINT server.' }, origin);

  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 4096) return send(response, 413, { error: 'Request body is too large.' }, origin);
  }
  let hash;
  try { hash = JSON.parse(body).hash; } catch { return send(response, 400, { error: 'Invalid JSON request.' }, origin); }
  if (!isHash(hash)) return send(response, 400, { error: 'A valid MD5, SHA-1, or SHA-256 hash is required.' }, origin);

  try {
    const vtResponse = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, { headers: { 'x-apikey': vtApiKey } });
    if (vtResponse.status === 404) return send(response, 200, { found: false }, origin);
    if (!vtResponse.ok) return send(response, 502, { error: `VirusTotal returned HTTP ${vtResponse.status}.` }, origin);
    const json = await vtResponse.json();
    return send(response, 200, compactReport(json?.data?.attributes || {}), origin);
  } catch (error) {
    return send(response, 502, { error: error instanceof Error ? error.message : 'VirusTotal request failed.' }, origin);
  }
});

server.listen(port, host, () => console.log(`[osint-server] listening on http://${host}:${port}`));
