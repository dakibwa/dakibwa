#!/usr/bin/env python3
"""
Dan's Running Dashboard — Local Server

Launches the repo copy of public/dashboard.html and injects private local
credentials at request time so secrets are never committed into the site repo.

  python3 launch.py
"""

import http.server
import json
import os
import threading
import urllib.parse
import urllib.request
import webbrowser

PORT = 8787

_script_dir = os.path.dirname(os.path.abspath(__file__))
_repo_dir = os.path.dirname(_script_dir)
_public_dir = os.path.join(_repo_dir, 'public')
_keys_candidates = [
    os.path.join(_repo_dir, 'api_keys.json'),
    os.path.join(os.path.dirname(_repo_dir), 'api_keys.json'),
]


def _load_keys():
    for path in _keys_candidates:
        try:
            with open(path) as f:
                data = json.load(f)
                data['_loaded_from'] = path
                return data
        except FileNotFoundError:
            continue
    return {'_loaded_from': None}


_KEYS = _load_keys()
STRAVA = _KEYS.get('strava', {})
WHOOP = _KEYS.get('whoop', {})

STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'


def _post_json(url, payload: dict) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def _post_form(url, payload: dict) -> dict:
    data = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def _dashboard_bootstrap():
    config = {
        'strava': {
            'clientId': STRAVA.get('client_id', ''),
            'clientSecret': STRAVA.get('client_secret', ''),
            'redirectUri': f'http://127.0.0.1:{PORT}/callback',
        },
        'whoop': {
            'clientId': WHOOP.get('client_id', ''),
            'clientSecret': WHOOP.get('client_secret', ''),
            'redirectUri': WHOOP.get('redirect_uri', f'http://127.0.0.1:{PORT}/callback'),
        },
    }
    return (
        '<script>'
        f'window.__DASHBOARD_LOCAL_CONFIG__ = {json.dumps(config)};'
        '</script>'
    )


def _load_dashboard_html():
    path = os.path.join(_public_dir, 'dashboard.html')
    with open(path, encoding='utf-8') as f:
        html = f.read()
    marker = '</head>'
    return html.replace(marker, f'{_dashboard_bootstrap()}\n{marker}', 1)


class DashboardHandler(http.server.SimpleHTTPRequestHandler):

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if parsed.path == '/callback':
            code = params.get('code', [''])[0]
            state = params.get('state', [''])[0]
            error = params.get('error', [''])[0]

            if error or not code:
                self.redirect(f'/dashboard.html?auth_error={urllib.parse.quote(error or "no_code")}')
                return

            if state == 'whoop':
                self._handle_whoop_callback(code)
            else:
                self._handle_strava_callback(code)
            return

        if parsed.path in ('', '/'):
            self.redirect('/dashboard.html')
            return

        if parsed.path == '/dashboard.html':
            body = _load_dashboard_html().encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        super().do_GET()

    def _handle_strava_callback(self, code):
        try:
            d = _post_json(STRAVA_TOKEN_URL, {
                'client_id': STRAVA.get('client_id', ''),
                'client_secret': STRAVA.get('client_secret', ''),
                'code': code,
                'grant_type': 'authorization_code',
            })
            if 'access_token' not in d:
                raise ValueError(d.get('message', 'Strava token exchange failed'))

            dest = (
                f'/dashboard.html?strava_access_token={urllib.parse.quote(d["access_token"])}'
                f'&strava_refresh_token={urllib.parse.quote(d["refresh_token"])}'
                f'&strava_expires_at={d.get("expires_at", "")}'
            )
            self.redirect(dest)
        except Exception as e:
            self.redirect(f'/dashboard.html?auth_error={urllib.parse.quote(str(e))}')

    def _handle_whoop_callback(self, code):
        try:
            d = _post_form(WHOOP_TOKEN_URL, {
                'grant_type': 'authorization_code',
                'code': code,
                'client_id': WHOOP.get('client_id', ''),
                'client_secret': WHOOP.get('client_secret', ''),
                'redirect_uri': WHOOP.get('redirect_uri', f'http://127.0.0.1:{PORT}/callback'),
            })
            if 'access_token' not in d:
                raise ValueError(d.get('error_description', 'Whoop token exchange failed'))

            dest = (
                f'/dashboard.html?whoop_access_token={urllib.parse.quote(d["access_token"])}'
                f'&whoop_refresh_token={urllib.parse.quote(d["refresh_token"])}'
                '&state=whoop'
            )
            self.redirect(dest)
        except Exception as e:
            self.redirect(f'/dashboard.html?auth_error={urllib.parse.quote(str(e))}&state=whoop')

    def redirect(self, location):
        self.send_response(302)
        self.send_header('Location', location)
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


def open_browser():
    import time

    time.sleep(0.9)
    webbrowser.open(f'http://127.0.0.1:{PORT}/dashboard.html')


def main():
    os.chdir(_public_dir)

    threading.Thread(target=open_browser, daemon=True).start()

    print('━' * 46)
    print("  Dan's Running Dashboard")
    print(f'  ->  http://127.0.0.1:{PORT}/dashboard.html')
    print()
    print('  Keep this window open while using')
    print('  the dashboard. Press Ctrl+C to stop.')
    if _KEYS.get('_loaded_from'):
        print(f'  Credentials: {_KEYS["_loaded_from"]}')
    else:
        print('  Credentials: api_keys.json not found')
    print('━' * 46)

    try:
        with http.server.HTTPServer(('127.0.0.1', PORT), DashboardHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nDashboard stopped.')
    except OSError as e:
        if 'Address already in use' in str(e):
            print(f'\nPort {PORT} is already in use.')
            print(f'Open http://127.0.0.1:{PORT}/dashboard.html in your browser,')
            print('or stop the other process first.')
        else:
            raise


if __name__ == '__main__':
    main()
