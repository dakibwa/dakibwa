# Akibwa Vitals Cloudflare Worker

This Worker is the private refresh runner for the public Vitals dashboard.

- Scheduled daily by Cloudflare cron.
- Refreshes WHOOP server-side.
- Stores the rotated WHOOP refresh token in Cloudflare KV.
- Stores only public aggregate health JSON in KV.
- Serves the aggregate JSON at `/vitals`.

Secrets are set with Wrangler and must never be committed:

```bash
npx wrangler secret put WHOOP_CLIENT_ID --config workers/vitals-refresh/wrangler.jsonc
npx wrangler secret put WHOOP_CLIENT_SECRET --config workers/vitals-refresh/wrangler.jsonc
npx wrangler secret put WHOOP_REFRESH_TOKEN --config workers/vitals-refresh/wrangler.jsonc
npx wrangler secret put ADMIN_TOKEN --config workers/vitals-refresh/wrangler.jsonc
```

Manual refresh:

```bash
curl -X POST https://akibwa-vitals-refresh.dakibwa.workers.dev/refresh \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Public aggregate data:

```bash
curl https://akibwa-vitals-refresh.dakibwa.workers.dev/vitals
```
