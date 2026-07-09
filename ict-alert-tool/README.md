# ICT Alert Tool (prototype)

Daily-bar backtest of an ICT 2022 Model + TTrades fractal detection
sequence (liquidity sweep → market structure shift → displacement → OTE
retracement) on EUR/USD and GBP/USD.

This is a research prototype, not a live tool yet — see `CLAUDE.md` for
the full context and the plan to port this to intraday bars with live
notifications.

## Run it

```
cd ict-alert-tool
python3 ict_ttrades_backtest.py
```

Regenerates `backtest_summary.txt` and `backtest_trades.csv` from the CSVs
in `data/`.

## Files

- `ict_ttrades_backtest.py` — detection + backtest engine
- `data/eurusd_daily.csv`, `data/gbpusd_daily.csv` — daily OHLC input
- `backtest_summary.txt` — per-instrument and combined stats
- `backtest_trades.csv` — one row per detected trade (sweep/MSS/entry/stop/targets/exit)
- `CLAUDE.md` — build plan for the live intraday alert tool
