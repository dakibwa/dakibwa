# Deploy the Running Dashboard API Worker

This Cloudflare Worker handles all OAuth token exchange server-side
so your Strava and Whoop secrets never appear in the browser.

## One-time setup

### 1. Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. Deploy the Worker
```bash
cd "Running Dashboard/worker"
npm install
npm run deploy
```

This gives you a URL like:
`https://running-dashboard-api.YOUR_SUBDOMAIN.workers.dev`

### 3. Set secrets (run each line, paste value when prompted)
```bash
wrangler secret put STRAVA_CLIENT_ID       # 211823
wrangler secret put STRAVA_CLIENT_SECRET   # (from api_keys.json)
wrangler secret put WHOOP_CLIENT_ID        # (from api_keys.json)
wrangler secret put WHOOP_CLIENT_SECRET    # (from api_keys.json)
wrangler secret put DASHBOARD_URL          # https://akibwa.com/dashboard.html
```

### 4. Update dashboard.html
In `dashboard.html`, update the `WORKER_URL` constant near the top of the `<script>`:
```js
const WORKER_URL = 'https://running-dashboard-api.YOUR_SUBDOMAIN.workers.dev';
```

### 5. Register OAuth redirect URIs
**Strava** → https://www.strava.com/settings/api
Add redirect URI: `https://running-dashboard-api.YOUR_SUBDOMAIN.workers.dev/strava/callback`

**Whoop** → https://developer.whoop.com
Add redirect URI: `https://running-dashboard-api.YOUR_SUBDOMAIN.workers.dev/whoop/callback`

### 6. (Optional) Custom domain
Point `api.akibwa.com` to the Worker in your Cloudflare dashboard:
Workers → your worker → Triggers → Custom Domains → Add `api.akibwa.com`

Then update `WORKER_URL` to `https://api.akibwa.com`.

## How it works
```
Browser → /strava/auth → Strava OAuth
Strava  → Worker /strava/callback (with code)
Worker  → exchanges code for tokens (secret never leaves Worker)
Worker  → redirects browser to dashboard with tokens in URL
Dashboard stores tokens in localStorage for future refreshes
```

Subsequent token refreshes: dashboard POSTs saved refresh_token
to Worker → Worker exchanges → returns new access_token.
