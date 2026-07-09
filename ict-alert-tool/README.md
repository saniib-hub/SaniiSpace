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
- **Live Monitor** — OANDA API key / account ID form. Held in server memory
  only, never written to disk. See the scope note in that panel and in
  `api/live_monitor.py` for exactly what it does and doesn't do yet.

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
- `api/` — FastAPI backend (serves backtest results as JSON; OANDA client +
  live-monitor skeleton)
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
