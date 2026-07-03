const DEFAULT_TIMEOUT_SECONDS = 180;

export function buildSandboxConfig(env = process.env) {
  return {
    provider: (env.SANDBOX_PROVIDER || 'cape').toLowerCase(),
    apiUrl: (env.SANDBOX_API_URL || '').replace(/\/$/, ''),
    token: env.SANDBOX_API_TOKEN || '',
    verifyTls: String(env.SANDBOX_VERIFY_TLS || 'true').toLowerCase() !== 'false',
    timeoutSeconds: Number(env.SANDBOX_TIMEOUT_SECONDS || DEFAULT_TIMEOUT_SECONDS),
    route: env.SANDBOX_ROUTE || 'none',
    machine: env.SANDBOX_MACHINE || '',
    platform: env.SANDBOX_PLATFORM || 'windows',
    tags: env.SANDBOX_TAGS || 'sentinelx,malware',
    enforceRemote: String(env.SANDBOX_ENFORCE_REMOTE || 'true').toLowerCase() !== 'false',
  };
}

export function validateSandboxConfig(config) {
  if (!config.apiUrl) {
    return {
      enabled: false,
      reason: 'No sandbox API configured. Set SANDBOX_API_URL to a CAPE/Cuckoo service running on isolated VM infrastructure.',
    };
  }
  if (!['cape', 'cuckoo'].includes(config.provider)) {
    throw new Error(`Unsupported SANDBOX_PROVIDER "${config.provider}". Supported providers: cape, cuckoo.`);
  }
  if (config.enforceRemote && isLocalHostUrl(config.apiUrl)) {
    throw new Error(
      'Refusing localhost sandbox API while SANDBOX_ENFORCE_REMOTE=true. Point SANDBOX_API_URL at an isolated sandbox controller, or explicitly set SANDBOX_ENFORCE_REMOTE=false for a lab-only controller.',
    );
  }
  return { enabled: true };
}

function isLocalHostUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host);
  } catch {
    return false;
  }
}

function authHeaders(config) {
  const headers = {};
  if (config.token) headers.Authorization = `Bearer ${config.token}`;
  return headers;
}

function appendOptional(form, key, value) {
  if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
}

export async function submitToSandbox(config, sample, fileBlob) {
  const state = validateSandboxConfig(config);
  if (!state.enabled) return null;

  const form = new FormData();
  form.append('file', fileBlob, sample.filename || 'sample.bin');
  appendOptional(form, 'timeout', config.timeoutSeconds);
  appendOptional(form, 'route', config.route);
  appendOptional(form, 'machine', config.machine);
  appendOptional(form, 'platform', config.platform);
  appendOptional(form, 'tags', config.tags);
  appendOptional(form, 'options', `route=${config.route},procmemdump=yes,free=yes`);

  const candidates = [
    `${config.apiUrl}/apiv2/tasks/create/file/`,
    `${config.apiUrl}/tasks/create/file`,
  ];

  let lastError = null;
  for (const url of candidates) {
    try {
      const response = await fetch(url, { method: 'POST', headers: authHeaders(config), body: form });
      if (!response.ok) {
        lastError = new Error(`sandbox submit ${url} failed: ${response.status} ${await response.text()}`);
        continue;
      }
      const json = await response.json();
      const taskId = json?.task_id || json?.data?.task_id || json?.id;
      if (!taskId) throw new Error(`sandbox submit ${url} returned no task id`);
      return {
        task_id: taskId,
        submit_url: url,
        provider: config.provider,
        route: config.route,
        machine: config.machine || null,
        platform: config.platform,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('sandbox submit failed');
}

export async function fetchSandboxReport(config, taskId, attempts, intervalMs, sleep) {
  const state = validateSandboxConfig(config);
  if (!state.enabled || !taskId) return null;

  const reportUrls = [
    `${config.apiUrl}/apiv2/tasks/get/report/${taskId}/`,
    `${config.apiUrl}/tasks/report/${taskId}`,
    `${config.apiUrl}/apiv2/tasks/view/${taskId}/`,
  ];

  for (let attempt = 1; attempt <= attempts; attempt++) {
    for (const url of reportUrls) {
      const response = await fetch(url, { headers: authHeaders(config) });
      if (response.status === 404) continue;
      if (!response.ok) continue;

      const json = await response.json();
      const status = json?.task?.status || json?.data?.status || json?.status;
      const complete = !status || ['reported', 'completed', 'success', 'finished'].includes(String(status).toLowerCase());
      if (complete && (json?.behavior || json?.signatures || json?.malscore || json?.target || json?.data)) {
        return normalizeSandboxReport(json, config.provider);
      }
    }
    await sleep(intervalMs);
  }
  return { status: 'timeout', task_id: taskId, provider: config.provider };
}

function normalizeSandboxReport(report, provider) {
  const data = report?.data && typeof report.data === 'object' ? report.data : report;
  return {
    provider,
    task: data.task || data.info || report.task || null,
    target: data.target || report.target || null,
    signatures: Array.isArray(data.signatures) ? data.signatures : [],
    malscore: data.malscore ?? data.info?.score ?? report.malscore ?? null,
    behavior: data.behavior || report.behavior || null,
    network: data.network || report.network || null,
    dropped: data.dropped || report.dropped || [],
    screenshots: data.screenshots || report.screenshots || [],
    raw: report,
  };
}

export function summarizeSandbox(report) {
  if (!report) return { score: 0, signatures: [], mitre: [], notes: 'No sandbox configured.' };
  if (report.error) return { score: 0, signatures: [], mitre: [], notes: `Sandbox error: ${report.error}` };
  if (report.status === 'timeout') return { score: 0, signatures: [], mitre: [], notes: 'Sandbox report timed out.' };

  const signatures = Array.isArray(report.signatures)
    ? report.signatures.map(sig => sig.name || sig.description || String(sig)).filter(Boolean)
    : [];

  const ttps = new Set();
  for (const sig of Array.isArray(report.signatures) ? report.signatures : []) {
    const marks = sig.mitre || sig.ttps || [];
    for (const item of marks) {
      if (typeof item === 'string') ttps.add(item);
      if (item?.id) ttps.add(item.id);
    }
  }

  const networkScore = report.network && JSON.stringify(report.network).length > 20 ? 10 : 0;
  const droppedScore = Array.isArray(report.dropped) && report.dropped.length ? 10 : 0;
  const score = Math.max(
    Number(report.malscore || 0) * 10,
    Number(report.task?.score || 0) * 10,
    signatures.length ? Math.min(100, 35 + signatures.length * 8 + networkScore + droppedScore) : networkScore + droppedScore,
  );

  return {
    score: Math.round(Math.min(100, score)),
    signatures: signatures.slice(0, 30),
    mitre: Array.from(ttps).slice(0, 25),
    notes: signatures.length
      ? `Sandbox signatures: ${signatures.slice(0, 8).join(', ')}.`
      : 'Sandbox report completed without signature names.',
  };
}
