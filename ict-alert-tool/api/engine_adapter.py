"""
Adapts ict_ttrades_backtest.py's dataclasses/functions into plain JSON-able
dicts for the web API, without modifying the (verified) engine itself.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ict_ttrades_backtest import load_csv, run_backtest, summarize  # noqa: E402

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

INSTRUMENT_FILES = {
    "EURUSD": "eurusd_daily.csv",
    "GBPUSD": "gbpusd_daily.csv",
}


def get_bars(instrument):
    path = os.path.join(DATA_DIR, INSTRUMENT_FILES[instrument])
    return load_csv(path)


def bars_to_json(bars):
    return [{"date": b.date, "open": b.o, "high": b.h, "low": b.l, "close": b.c} for b in bars]


def trade_to_json(t):
    return {
        "instrument": t.instrument,
        "direction": t.direction,
        "bias_aligned": t.bias_aligned,
        "sweep_date": t.sweep_date,
        "sweep_price": round(t.sweep_price, 5),
        "mss_date": t.mss_date,
        "mss_price": round(t.mss_price, 5),
        "entry_date": t.entry_date,
        "entry_price": round(t.entry_price, 5),
        "stop": round(t.stop, 5),
        "target_2r": round(t.target_2r, 5),
        "target_3r": round(t.target_3r, 5),
        "exit_date_2r": t.exit_date_2r,
        "exit_price_2r": round(t.exit_price_2r, 5) if t.exit_price_2r is not None else None,
        "result_r_2r": t.result_r_2r,
        "exit_date_3r": t.exit_date_3r,
        "exit_price_3r": round(t.exit_price_3r, 5) if t.exit_price_3r is not None else None,
        "result_r_3r": t.result_r_3r,
    }


def stats(trades, target_key="result_r_2r"):
    if not trades:
        return {"trades": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "avg_r": 0.0,
                "total_r": 0.0, "profit_factor": 0.0, "max_drawdown_r": 0.0}
    n = len(trades)
    vals = [getattr(t, target_key) for t in trades]
    wins = [v for v in vals if v > 0]
    losses = [v for v in vals if v <= 0]
    gains = sum(wins)
    pain = abs(sum(losses)) or 0.0001
    running, peak, max_dd = 0.0, 0.0, 0.0
    for v in vals:
        running += v
        peak = max(peak, running)
        max_dd = min(max_dd, running - peak)
    return {
        "trades": n,
        "wins": len(wins),
        "losses": len(losses),
        "win_rate": round(100 * len(wins) / n, 1),
        "avg_r": round(sum(vals) / n, 2),
        "total_r": round(sum(vals), 2),
        "profit_factor": round(gains / pain, 2),
        "max_drawdown_r": round(max_dd, 2),
    }


_cache = {}


def get_all_trades():
    if "trades" in _cache:
        return _cache["trades"]
    all_trades = []
    for instrument in INSTRUMENT_FILES:
        bars = get_bars(instrument)
        all_trades.extend(run_backtest(bars, instrument))
    _cache["trades"] = all_trades
    return all_trades


def get_summary():
    all_trades = get_all_trades()
    out = {"by_instrument": {}, "combined": {}}
    for instrument in INSTRUMENT_FILES:
        inst_trades = [t for t in all_trades if t.instrument == instrument]
        aligned = [t for t in inst_trades if t.bias_aligned]
        out["by_instrument"][instrument] = {
            "all": {"2r": stats(inst_trades, "result_r_2r"), "3r": stats(inst_trades, "result_r_3r")},
            "bias_aligned": {"2r": stats(aligned, "result_r_2r"), "3r": stats(aligned, "result_r_3r")},
        }
    aligned_all = [t for t in all_trades if t.bias_aligned]
    out["combined"] = {
        "all": {"2r": stats(all_trades, "result_r_2r"), "3r": stats(all_trades, "result_r_3r")},
        "bias_aligned": {"2r": stats(aligned_all, "result_r_2r"), "3r": stats(aligned_all, "result_r_3r")},
    }
    return out
