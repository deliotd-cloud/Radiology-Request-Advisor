/**
 * Radiology Request Advisor — shared usage log (Cloudflare Worker + D1)
 *
 * Endpoints
 *   POST /log     record one use. Public, write-only, rate limited.
 *   GET  /stats   aggregate counts only. Public, read-only, no raw rows.
 *   GET  /export  full CSV export. Requires the ADMIN_TOKEN secret.
 *   GET  /        plain-text description of the above.
 *
 * DESIGN NOTES
 *
 * The page that calls this is public, so anything embedded in it is public.
 * The endpoint is therefore designed to be safe when the whole world knows
 * about it:
 *
 *   - It is WRITE-ONLY for anonymous callers. There is no key that grants
 *     read access to raw rows; /export requires a secret you alone hold.
 *   - There is NO free-text field. The client sends only a scenario id, which
 *     must appear in the generated allowlist in scenarios.js; the label and
 *     category are looked up server-side and any client-supplied text is
 *     discarded. It is therefore not possible for a hostile or modified
 *     client to store arbitrary text — let alone patient data — in the
 *     database, even though the endpoint is public.
 *   - The timestamp is assigned by the server, not taken from the client.
 *   - Rate limited per caller. IPs are salted-hashed with a daily-rotating
 *     salt and stored only inside short-lived rate-limit buckets, never
 *     alongside events.
 */

import { SCENARIOS } from './scenarios.js';

const WINDOW_MS      = 10 * 60 * 1000;   // rate-limit window
const MAX_PER_WINDOW = 60;               // requests per IP per window
const RETENTION_DAYS = 0;                // 0 = keep forever; set e.g. 730 to auto-prune

const CONTRAST = new Set(['none', 'iodinated', 'gadolinium']);
const ID_RE    = /^[a-z0-9_]{1,40}$/;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400'
};

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra }
  });

const dayKey = ts => new Date(ts).toISOString().slice(0, 10);

async function hashIp(ip, salt) {
  const data = new TextEncoder().encode(salt + '|' + ip);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Returns true when the caller is over budget. */
async function rateLimited(env, request) {
  const ip   = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const now  = Date.now();
  const salt = (env.RATE_SALT || 'rra') + '|' + dayKey(now);   // rotates daily
  const key  = await hashIp(ip, salt) + ':' + Math.floor(now / WINDOW_MS);

  const row = await env.DB.prepare('SELECT n FROM ratelimit WHERE bucket = ?1')
    .bind(key).first();

  if (row && row.n >= MAX_PER_WINDOW) return true;

  await env.DB.prepare(
    `INSERT INTO ratelimit (bucket, n, expires) VALUES (?1, 1, ?2)
     ON CONFLICT(bucket) DO UPDATE SET n = n + 1`
  ).bind(key, now + WINDOW_MS).run();

  return false;
}

/**
 * Strict validation. Anything unexpected returns null and the request is
 * rejected with 400.
 *
 * Note what this does NOT do: it never copies a string out of the request
 * body into the row. `label` and `cat` come from the server-side allowlist,
 * keyed by an id that must match /^[a-z0-9_]{1,40}$/ AND exist in SCENARIOS.
 * Client-supplied `l` and `c` are ignored entirely.
 */
function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

  const matched = body.m === true || body.m === 1;
  const urgency = Number.isInteger(body.u) && body.u >= 0 && body.u <= 3 ? body.u : null;
  if (urgency === null) return null;

  const contrast = typeof body.cn === 'string' && CONTRAST.has(body.cn) ? body.cn : null;

  let rule = null, label = null, cat = null;
  if (matched) {
    if (typeof body.r !== 'string' || !ID_RE.test(body.r)) return null;
    const known = SCENARIOS[body.r];
    if (!known) return null;                 // unknown id — reject outright
    rule  = body.r;
    label = known[0];                        // from the allowlist, never the client
    cat   = known[1];
  }

  return { matched: matched ? 1 : 0, rule, label, cat, urgency, contrast };
}

async function handleLog(env, request) {
  if (await rateLimited(env, request))
    return json({ ok: false, error: 'rate limited' }, 429);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'invalid JSON' }, 400); }

  const v = validate(body);
  if (!v) return json({ ok: false, error: 'invalid payload' }, 400);

  const ts = Date.now();                       // server clock, not the client's
  await env.DB.prepare(
    `INSERT INTO events (ts, day, matched, rule, label, cat, urgency, contrast)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  ).bind(ts, dayKey(ts), v.matched, v.rule, v.label, v.cat, v.urgency, v.contrast).run();

  // Opportunistic housekeeping, roughly 1 request in 50.
  if (Math.random() < 0.02) {
    await env.DB.prepare('DELETE FROM ratelimit WHERE expires < ?1').bind(ts).run();
    if (RETENTION_DAYS > 0)
      await env.DB.prepare('DELETE FROM events WHERE ts < ?1')
        .bind(ts - RETENTION_DAYS * 86400000).run();
  }

  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM events').first();
  return json({ ok: true, total: total.n });
}

async function handleStats(env) {
  const now = Date.now();
  const q = sql => env.DB.prepare(sql);

  const [total, today, last7, matched, contrast, days, top, urg, first] = await Promise.all([
    q('SELECT COUNT(*) AS n FROM events').first(),
    q('SELECT COUNT(*) AS n FROM events WHERE day = ?1').bind(dayKey(now)).first(),
    q('SELECT COUNT(*) AS n FROM events WHERE ts > ?1').bind(now - 7 * 86400000).first(),
    q('SELECT COUNT(*) AS n FROM events WHERE matched = 1').first(),
    q("SELECT COUNT(*) AS n FROM events WHERE contrast IS NOT NULL AND contrast != 'none'").first(),
    q('SELECT day, COUNT(*) AS n FROM events WHERE ts > ?1 GROUP BY day')
      .bind(now - 14 * 86400000).all(),
    q(`SELECT COALESCE(label, 'No confident match') AS k, COUNT(*) AS n
        FROM events GROUP BY k ORDER BY n DESC LIMIT 10`).all(),
    q('SELECT urgency AS u, COUNT(*) AS n FROM events GROUP BY urgency').all(),
    q('SELECT MIN(ts) AS t FROM events').first()
  ]);

  const byDay = {};
  (days.results || []).forEach(r => { byDay[r.day] = r.n; });
  const series = [];
  for (let i = 13; i >= 0; i--) {
    const k = dayKey(now - i * 86400000);
    series.push({ k, n: byDay[k] || 0 });
  }

  const byUrg = [0, 0, 0, 0];
  (urg.results || []).forEach(r => { if (r.u >= 0 && r.u <= 3) byUrg[r.u] = r.n; });

  const n = total.n || 0;
  return json({
    ok: true,
    total: n,
    today: today.n,
    last7: last7.n,
    first: first.t || null,
    matchRate:    n ? Math.round(matched.n  / n * 100) : 0,
    contrastRate: n ? Math.round(contrast.n / n * 100) : 0,
    days: series,
    top: (top.results || []).map(r => ({ k: r.k, n: r.n })),
    byUrg
  });
}

async function handleExport(env, request) {
  const auth = request.headers.get('Authorization') || '';
  const tok  = auth.replace(/^Bearer\s+/i, '');
  if (!env.ADMIN_TOKEN || tok !== env.ADMIN_TOKEN)
    return new Response('Unauthorized\n', { status: 401 });

  const rows = await env.DB.prepare(
    'SELECT ts, day, matched, rule, label, cat, urgency, contrast FROM events ORDER BY ts'
  ).all();

  const urgLbl = ['Routine', '2-week', 'Urgent 24h', 'Emergency'];
  const csv = ['timestamp,date,scenario,category,urgency,contrast,matched']
    .concat((rows.results || []).map(r => [
      new Date(r.ts).toISOString(), r.day,
      '"' + String(r.label || 'No confident match').replace(/"/g, '""') + '"',
      r.cat || '', urgLbl[r.urgency] || '', r.contrast || '', r.matched ? 'yes' : 'no'
    ].join(',')))
    .join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rra-usage.csv"'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    try {
      if (url.pathname === '/log'    && request.method === 'POST') return await handleLog(env, request);
      if (url.pathname === '/stats'  && request.method === 'GET')  return await handleStats(env);
      if (url.pathname === '/export' && request.method === 'GET')  return await handleExport(env, request);

      if (url.pathname === '/')
        return new Response(
          'Radiology Request Advisor — shared usage log\n\n' +
          'POST /log     record one use (public, write-only, rate limited)\n' +
          'GET  /stats   aggregate counts (public, read-only)\n' +
          'GET  /export  CSV export (requires ADMIN_TOKEN)\n\n' +
          'No patient data is stored here.\n',
          { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS } }
        );

      return json({ ok: false, error: 'not found' }, 404);
    } catch (err) {
      return json({ ok: false, error: 'server error' }, 500);
    }
  }
};
