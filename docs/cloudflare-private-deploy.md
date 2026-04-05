# Private Cloudflare Deploy

This repo now supports a hosted, read-only Akibwa Life export for Cloudflare Pages.

## What gets deployed

- The same `life.html`, `life.css`, and `life.js` interface.
- A generated snapshot at `cloudflare-dist/data/life.json`.
- The AI-readable markdown layer at `cloudflare-dist/ai-context/*.md`.

The hosted export is intentionally read-only:

- no direct reads from `/Users/...`
- no journal write endpoints
- no transcription endpoints

That keeps the web copy private, portable, and independent of the local Python server.

## Build the hosted export

```bash
cd /Users/danatkinson/Dakibwa
npm run cloudflare:build
```

This writes the deployable bundle into `cloudflare-dist/`.

## First-time Cloudflare setup

1. Authenticate Wrangler:

```bash
npx wrangler login
```

2. Create a Pages project if you have not created one yet:

```bash
npx wrangler pages project create
```

Suggested values:

- Project name: `akibwa-life-private`
- Production branch: `main`

## Deploy

```bash
cd /Users/danatkinson/Dakibwa
npm run cloudflare:deploy
```

Or directly:

```bash
npx wrangler pages deploy ./cloudflare-dist --project-name akibwa-life-private
```

## Put it on `life.akibwa.com`

After the first Pages deploy succeeds:

1. Open Cloudflare Dashboard -> Workers & Pages -> `akibwa-life-private`.
2. Add the custom domain `life.akibwa.com`.
3. Wait for the custom domain to finish provisioning.

## Protect it with Cloudflare Access

Important order:

- attach the custom domain first
- then add the Access application

Recommended Access setup:

1. Open Cloudflare Zero Trust.
2. Add an Access application of type `Self-hosted`.
3. Choose the hostname `life.akibwa.com`.
4. Restrict it to your email identity or another rule you trust.

This gives you real authentication at the edge instead of a weak client-side password gate.

## Refreshing the hosted site

Whenever you want the web version to catch up with local changes:

```bash
cd /Users/danatkinson/Dakibwa
npm run cloudflare:deploy
```

That rebuilds the hosted snapshot from the latest local documents and republishes it.
