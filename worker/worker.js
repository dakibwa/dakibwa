/**
 * Dan's Running Dashboard — Cloudflare Worker
 *
 * Handles all OAuth token exchange server-side so secrets never
 * appear in browser-side code.
 *
 * Deploy:
 *   cd worker
 *   wrangler deploy
 *
 * Required environment variables (set via wrangler secret):
 *   STRAVA_CLIENT_ID     – your Strava client ID
 *   STRAVA_CLIENT_SECRET – your Strava client secret
 *   WHOOP_CLIENT_ID      – your Whoop client ID
 *   WHOOP_CLIENT_SECRET  – your Whoop client secret
 *   DASHBOARD_URL        – full URL of your dashboard, e.g. https://akibwa.com/dashboard.html
 *
 * Routes:
 *   GET  /strava/auth            → redirect browser to Strava OAuth
 *   GET  /strava/callback        → exchange code, redirect to dashboard
 *   POST /strava/refresh         → { refresh_token } → { access_token, refresh_token, expires_at }
 *   GET  /whoop/auth             → redirect browser to Whoop OAuth
 *   GET  /whoop/callback         → exchange code, redirect to dashboard
 *   POST /whoop/refresh          → { refresh_token } → { access_token, refresh_token }
 *   GET  /health                 → { ok: true }
 */

const STRAVA_AUTH_URL  = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const WHOOP_AUTH_URL   = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL  = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_API_BASE   = 'https://api.prod.whoop.com/developer/v2';
const WHOOP_SCOPES     = 'offline read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement';

// CORS headers — allow the dashboard origin to call the worker
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-WHOOP-TOKEN',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function redirect(url) {
  return Response.redirect(url, 302);
}

function workerBase(request) {
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

function getApiErrorMessage(payload, fallback) {
  return payload.error || payload.message || payload.error_description || fallback;
}

async function fetchRequiredWhoopJson(url, headers) {
  const response = await fetch(url, { headers });
  const payload = await readJson(response);

  if (!response.ok) {
    const error = new Error(getApiErrorMessage(payload, `Whoop API ${response.status}`));
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function fetchOptionalWhoopJson(url, headers) {
  const response = await fetch(url, { headers });

  if (response.status === 404) {
    return null;
  }

  const payload = await readJson(response);

  if (!response.ok) {
    const error = new Error(getApiErrorMessage(payload, `Whoop API ${response.status}`));
    error.status = response.status;
    throw error;
  }

  return payload;
}

function findLatestScoredRecovery(primaryRecovery, recoveries) {
  const seen = new Set();
  const candidates = [primaryRecovery, ...(recoveries || [])].filter(Boolean).filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });

  return candidates.find((entry) => {
    const state = entry.score_state || 'SCORED';
    return state === 'SCORED' && entry.score?.recovery_score != null;
  }) || null;
}

async function findLatestSleepForCycles(headers, cycles) {
  for (const cycle of cycles || []) {
    if (cycle?.id == null) continue;
    const sleep = await fetchOptionalWhoopJson(`${WHOOP_API_BASE}/cycle/${cycle.id}/sleep`, headers);
    if (sleep) return sleep;
  }
  return null;
}

async function fetchWhoopBundle(token) {
  const headers = { Authorization: `Bearer ${token}` };

  const [cycleCollection, recoveryCollection] = await Promise.all([
    fetchRequiredWhoopJson(`${WHOOP_API_BASE}/cycle?limit=7`, headers),
    fetchRequiredWhoopJson(`${WHOOP_API_BASE}/recovery?limit=7`, headers),
  ]);

  const cycles = cycleCollection.records || [];
  const cycle = cycles[0] || null;
  let recovery = null;

  if (cycle?.id != null) {
    recovery = await fetchOptionalWhoopJson(`${WHOOP_API_BASE}/cycle/${cycle.id}/recovery`, headers);
  }

  const recoveries = recoveryCollection.records || [];
  const sleep = await findLatestSleepForCycles(headers, cycles);
  const latestScoredRecovery = findLatestScoredRecovery(recovery, recoveries);
  const latestScoredCycle = cycles.find((entry) => entry?.score?.strain != null) || null;

  return {
    cycle,
    cycles,
    recovery,
    recoveries,
    sleep,
    latest_scored_recovery: latestScoredRecovery,
    latest_scored_cycle: latestScoredCycle,
  };
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Health check
    if (path === '/health') {
      return json({ ok: true, ts: Date.now() });
    }

    // ── STRAVA ──────────────────────────────────────────────────────────────
    if (path === '/strava/auth' && method === 'GET') {
      const redirectUri = `${workerBase(request)}/strava/callback`;
      const params = new URLSearchParams({
        client_id:     env.STRAVA_CLIENT_ID,
        redirect_uri:  redirectUri,
        response_type: 'code',
        scope:         'activity:read_all',
        state:         'strava',
      });
      return redirect(`${STRAVA_AUTH_URL}?${params}`);
    }

    if (path === '/strava/callback' && method === 'GET') {
      const code  = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error || !code) {
        return redirect(`${env.DASHBOARD_URL}?auth_error=${encodeURIComponent(error || 'no_code')}`);
      }

      try {
        const r = await fetch(STRAVA_TOKEN_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            client_id:     env.STRAVA_CLIENT_ID,
            client_secret: env.STRAVA_CLIENT_SECRET,
            code,
            grant_type:    'authorization_code',
          }),
        });
        const d = await r.json();
        if (!d.access_token) throw new Error(d.message || 'token exchange failed');

        const dest = new URL(env.DASHBOARD_URL);
        dest.searchParams.set('strava_access_token',  d.access_token);
        dest.searchParams.set('strava_refresh_token', d.refresh_token);
        dest.searchParams.set('strava_expires_at',    d.expires_at);
        return redirect(dest.toString());
      } catch (e) {
        return redirect(`${env.DASHBOARD_URL}?auth_error=${encodeURIComponent(e.message)}`);
      }
    }

    if (path === '/strava/refresh' && method === 'POST') {
      try {
        const body = await request.json();
        const r = await fetch(STRAVA_TOKEN_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            client_id:     env.STRAVA_CLIENT_ID,
            client_secret: env.STRAVA_CLIENT_SECRET,
            refresh_token: body.refresh_token,
            grant_type:    'refresh_token',
          }),
        });
        const d = await r.json();
        if (!d.access_token) throw new Error(d.message || 'refresh failed');
        return json({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at });
      } catch (e) {
        return json({ error: e.message }, 400);
      }
    }

    // ── WHOOP ───────────────────────────────────────────────────────────────
    if (path === '/whoop/auth' && method === 'GET') {
      const redirectUri = `${workerBase(request)}/whoop/callback`;
      const params = new URLSearchParams({
        client_id:     env.WHOOP_CLIENT_ID,
        redirect_uri:  redirectUri,
        response_type: 'code',
        scope:         WHOOP_SCOPES,
        state:         crypto.randomUUID(),
      });
      return redirect(`${WHOOP_AUTH_URL}?${params}`);
    }

    if (path === '/whoop/callback' && method === 'GET') {
      const code  = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error || !code) {
        return redirect(`${env.DASHBOARD_URL}?auth_error=${encodeURIComponent(error || 'no_code')}&state=whoop`);
      }

      try {
        const redirectUri = `${workerBase(request)}/whoop/callback`;
        const bodyParams = new URLSearchParams({
          grant_type:    'authorization_code',
          code,
          client_id:     env.WHOOP_CLIENT_ID,
          client_secret: env.WHOOP_CLIENT_SECRET,
          redirect_uri:  redirectUri,
        });
        const r = await fetch(WHOOP_TOKEN_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    bodyParams,
        });
        const d = await r.json();
        if (!d.access_token) throw new Error(d.error_description || 'whoop token exchange failed');

        const dest = new URL(env.DASHBOARD_URL);
        dest.searchParams.set('whoop_access_token',  d.access_token);
        dest.searchParams.set('whoop_refresh_token', d.refresh_token);
        dest.searchParams.set('state', 'whoop');
        return redirect(dest.toString());
      } catch (e) {
        return redirect(`${env.DASHBOARD_URL}?auth_error=${encodeURIComponent(e.message)}&state=whoop`);
      }
    }

    if (path === '/whoop/refresh' && method === 'POST') {
      try {
        const body = await request.json();
        const bodyParams = new URLSearchParams({
          grant_type:    'refresh_token',
          refresh_token: body.refresh_token,
          client_id:     env.WHOOP_CLIENT_ID,
          client_secret: env.WHOOP_CLIENT_SECRET,
          scope:         'offline',
        });
        const r = await fetch(WHOOP_TOKEN_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    bodyParams,
        });
        const d = await r.json();
        if (!d.access_token) throw new Error(d.error_description || 'whoop refresh failed');
        return json({ access_token: d.access_token, refresh_token: d.refresh_token });
      } catch (e) {
        return json({ error: e.message }, 400);
      }
    }

    // ── WHOOP DATA PROXY ────────────────────────────────────────────────────
    // Whoop's API blocks direct browser requests (CORS), so all data fetches
    // are proxied through here using the user's access token.
    if (path === '/whoop/data' && method === 'GET') {
      const token = request.headers.get('x-whoop-token');
      if (!token) return json({ error: 'missing token' }, 401);

      try {
        const bundle = await fetchWhoopBundle(token);
        return json({
          cycle: {
            records: bundle.cycle ? [bundle.cycle] : [],
            next_token: null,
          },
          cycles: {
            records: bundle.cycles || [],
            next_token: null,
          },
          recovery: {
            records: bundle.recoveries || [],
            next_token: null,
          },
          sleep: {
            records: bundle.sleep ? [bundle.sleep] : [],
            next_token: null,
          },
          latest_cycle: bundle.cycle,
          latest_recovery: bundle.recovery,
          latest_sleep: bundle.sleep,
          latest_scored_recovery: bundle.latest_scored_recovery,
          latest_scored_cycle: bundle.latest_scored_cycle,
          recoveries: bundle.recoveries || [],
        });
      } catch (e) {
        return json({ error: e.message }, e.status === 401 ? 401 : 500);
      }
    }

    return json({ error: 'not found' }, 404);
  },
};
