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

// CORS headers — allow the dashboard origin to call the worker
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
      const scopes = 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement';
      const params = new URLSearchParams({
        client_id:     env.WHOOP_CLIENT_ID,
        redirect_uri:  redirectUri,
        response_type: 'code',
        scope:         scopes,
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

      const h    = { Authorization: `Bearer ${token}` };
      const base = 'https://api.prod.whoop.com/developer/v1';

      try {
        const [recRes, cycRes, slpRes] = await Promise.all([
          fetch(`${base}/recovery?limit=7`,        { headers: h }),
          fetch(`${base}/cycle?limit=1`,           { headers: h }),
          fetch(`${base}/activity/sleep?limit=1`,  { headers: h }),
        ]);
        // Surface Whoop auth/API errors clearly
        if (!recRes.ok) {
          const errBody = await recRes.clone().json().catch(() => ({}));
          const msg = errBody.error || errBody.message || 'check token';
          return json({ error: `Whoop API ${recRes.status}: ${msg}` }, recRes.status === 401 ? 401 : 500);
        }
        const [recovery, cycle, sleep] = await Promise.all([
          recRes.json(), cycRes.json(), slpRes.json(),
        ]);
        return json({ recovery, cycle, sleep });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    return json({ error: 'not found' }, 404);
  },
};
