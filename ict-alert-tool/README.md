# ICT Alert Tool

Backtest + browser dashboard for an ICT 2022 Model + TTrades fractal
detection sequence (liquidity sweep → market structure shift → displacement
→ OTE retracement) on EUR/USD and GBP/USD daily bars, plus a live-monitor
panel that's wired for OANDA once you supply an API key.

Every number in the dashboard has been independently re-derived from the
raw OHLC and verified — see `verification_report.md` / the Verification tab.

## Run the web tool

Two processes, both needed:

```bash
# 1. API (from ict-alert-tool/)
cd api
pip install -r requirements.txt
uvicorn main:app --reload --port 8123

# 2. Frontend (from ict-alert-tool/, in another terminal)
cd web
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). The dev server
proxies `/api/*` to the backend on port 8123.

### Tabs

- **Dashboard** — win rate / avg R / total R / profit factor / max
  drawdown, filterable by instrument, bias-alignment, and 2R vs 3R target.
- **Trades & Charts** — every detected trade in a table; click a row for a
  candlestick chart with the sweep, MSS, OTE entry zone, stop, and target
  levels overlaid (same levels as the reference charts in this project).
- **Verification** — the independent audit report (see below).
- **Alerts** — live feed of every ARMED / ENTRY triggered / STOP hit / 2R
  TARGET hit / 3R TARGET hit event, with matching browser notifications.
  Includes a "demo replay" that runs the verified historical data through
  the real alert engine at adjustable speed, so you can watch the whole
  pipeline fire with no OANDA key needed. Once Live Monitor is configured,
  the same feed carries real alerts.
- **Live Monitor** — OANDA API key / account ID form. Held in server memory
  only, never written to disk. Once configured, a background poller checks
  for fresh candles during the London/New York kill zones automatically —
  no need to click "check now." See the scope note in that panel and in
  `api/live_monitor.py` for exactly what it does and doesn't do yet.

## The alert engine

`api/alert_engine.py` is a from-scratch, bar-by-bar state machine (not the
batch `ict_ttrades_backtest.py` re-run on a sliding window) that fires the
moment each stage happens: sweep → **ARMED** (MSS + displacement confirmed,
entry zone/stop/targets known) → **ENTRY triggered** (price taps the OTE
zone) → **STOP hit** / **2R TARGET hit** / **3R TARGET hit**. It's built to
never silently skip a real sweep: every confirmed, not-yet-swept swing is
checked every bar, not just the most recent one (the batch engine's own
simplification — see `verification_report.md`'s exhaustive re-scan).
`api/test_alert_engine.py` replays the full historical CSVs through it and
confirms it reproduces 7 of the 8 verified trades exactly, with the eighth
explained and asserted, not silently dropped (two of the original 8
"trades" turned out to reference a liquidity level that real price action
had already reclaimed a day earlier — the batch engine split that into two
sequential trades because it only checks one swing at a time; this engine
correctly recognizes it as a single event). Run
`python3 -m unittest api/test_alert_engine.py` to see it for yourself.

## Run just the backtest (no web UI)

```bash
python3 ict_ttrades_backtest.py
```

Regenerates `backtest_summary.txt` and `backtest_trades.csv` from the CSVs
in `data/`.

## Verify the backtest

```bash
python3 verify_backtest.py
```

Independently re-derives every trade's sweep/MSS/displacement/OTE-entry/
stop/target/exit from the raw bars (not by reusing the engine's own
functions) and cross-checks against `backtest_trades.csv`. Also brute-force
re-scans every valid swing pairing to confirm the engine isn't silently
skipping any setup the stated rules would allow. Writes
`verification_report.md`. Current result: **0 discrepancies** across all 8
trades.

## Files

- `ict_ttrades_backtest.py` — detection + backtest engine
- `verify_backtest.py` — independent verification script
- `verification_report.md` — its output (regenerate with the command above)
- `data/eurusd_daily.csv`, `data/gbpusd_daily.csv` — daily OHLC input
- `backtest_summary.txt` — per-instrument and combined stats
- `backtest_trades.csv` — one row per detected trade (sweep/MSS/entry/stop/targets/exit)
- `api/` — FastAPI backend: serves backtest results as JSON; `alert_engine.py`
  (the live/replay alert state machine) + `test_alert_engine.py`; `alert_bus.py`
  + `replay.py` (SSE pub/sub + demo replay runner); `oanda_client.py` +
  `live_monitor.py` (OANDA candle fetch + kill-zone background poller)
- `web/` — React + TypeScript + Tailwind + shadcn/ui dashboard
- `CLAUDE.md` — build plan / context for extending this to a full intraday
  live-alert tool

## Honest limitations

- Backtest sample is small: 8 trades over ~100 days across two pairs.
  Directionally promising, not statistically conclusive.
- The Live Monitor only re-runs the **daily-bar** engine against fresh
  OANDA candles — it does not yet implement the intraday (5m/15m execution
  + kill-zone timing) port described in `CLAUDE.md` step 3. That's real
  follow-up work, not done here.
- Nothing here places trades. It's decision support only.
