# Deploying to Render

I could not deploy this myself from this session — outbound access to
Render's API (and to every financial data API I tried: OANDA, Yahoo
Finance, Alpha Vantage, Stooq) is blocked by this session's network egress
policy (confirmed via `curl` returning 403 at the proxy). That's an
organization-level restriction, not something to route around. Render's
*own* deploy pipeline pulls from GitHub directly and isn't affected by
that — you just need to click through it yourself. It's a few minutes.

## One-time setup

1. Create a free account at https://render.com if you don't have one.
2. In the Render dashboard, connect your GitHub account and grant it
   access to the `saniib-hub/SaniiSpace` repo (Render walks you through
   this the first time you create a service from GitHub).

## Deploy via Blueprint

`render.yaml` at the repo root defines both services. To deploy:

1. Render dashboard → **New +** → **Blueprint**.
2. Select the `saniib-hub/SaniiSpace` repo and the branch with this code
   (`claude/new-session-d4cswk`, or `main` once the PR is merged).
3. Render reads `render.yaml` and shows you two services:
   - `ict-alert-api` — the FastAPI backend (Python web service, free plan)
   - `ict-alert-web` — the React frontend (static site, free plan)
4. Review them, then click **Apply**.

Render builds both. The static site build bakes in `VITE_API_BASE` (the
API's URL) at build time; the API's `ALLOWED_ORIGINS` env var is set to the
static site's URL for CORS. Both are pre-filled in `render.yaml` with the
*expected* URLs (`https://ict-alert-api.onrender.com` and
`https://ict-alert-web.onrender.com`), which Render assigns automatically
**if those names aren't already taken** by someone else's Render service.

## If the assigned URLs differ

Render appends a random suffix instead (e.g. `ict-alert-web-ab12.onrender.com`)
if your chosen name collides with an existing one. If that happens:

1. Open each service in the Render dashboard and copy its actual URL.
2. On `ict-alert-api` → Environment → update `ALLOWED_ORIGINS` to the
   actual `ict-alert-web` URL.
3. On `ict-alert-web` → Environment → update `VITE_API_BASE` to the actual
   `ict-alert-api` URL, then trigger **Manual Deploy** (env vars for static
   sites only take effect on a fresh build).

## Using it

Open the `ict-alert-web` URL — that's the tool, live, reachable any time.
Configure your OANDA API key in the **Live Monitor** tab once it's up
(this happens live in the browser, no redeploy needed, and is held in the
API service's memory only — never written to disk, and cleared if the
service restarts).

## Free-tier caveat

Render's free web services (the API, not the static site) spin down after
~15 minutes of no traffic and take 30-50 seconds to wake up on the next
request. The frontend itself loads instantly (static hosting doesn't
sleep), but the first API call after a quiet period — dashboard stats,
starting a replay, checking live status — will be slow that one time. If
you want the API always warm, upgrade `ict-alert-api` to a paid instance
plan in the Render dashboard (Starter is a few dollars a month).

## What still needs a real OANDA key to do anything

Deploying doesn't make Live Monitor "live" by itself — the OANDA client
code has only been tested against mocked HTTP responses (see
`api/test_oanda_client.py`) because no real account has ever been
available to this project. Add your own free OANDA practice account API
key in the Live Monitor tab to actually start it fetching real candles and
firing real alerts.
