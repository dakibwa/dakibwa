# Local Dashboard Launcher

This folder launches the repo copy of `public/dashboard.html` locally.

## Credentials

Place `api_keys.json` in the repo root:

```json
{
  "strava": {
    "client_id": "",
    "client_secret": ""
  },
  "whoop": {
    "client_id": "",
    "client_secret": "",
    "redirect_uri": "http://127.0.0.1:8787/callback"
  }
}
```

For a transition period, `launch.py` also falls back to the older `../api_keys.json`
location in the parent `Projects` folder.
