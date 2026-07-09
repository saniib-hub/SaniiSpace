"""
Live-monitor skeleton.

Honest scope note: this wires up real OANDA candle fetching and re-uses the
*verified daily-bar* detection engine to check whether a fresh sweep+MSS
setup has just armed on the latest daily close. It does NOT implement the
full intraday (5m/15m execution + daily bias) port described in
CLAUDE.md step 3 -- that is real, separate work (different bar granularity,
kill-zone time filters, incremental state tracking) that hasn't been done
yet. Until that port exists, this only tells you "a daily setup just armed
on today's close," not "arm 30-60 minutes before an intraday entry."

Requires a real OANDA API key to do anything -- with no key configured,
`check_now()` returns a NOT_CONFIGURED status.
"""

import os
import sys
from dataclasses import dataclass, field
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ict_ttrades_backtest import (  # noqa: E402
    find_fractal_swings, trend_state_at, try_bullish_setup, try_bearish_setup,
)
from oanda_client import OandaClient, OandaError  # noqa: E402

KILL_ZONES_NY = [
    {"name": "London", "start": "03:00", "end": "04:00"},
    {"name": "New York", "start": "08:00", "end": "09:00"},
]


@dataclass
class LiveConfig:
    api_key: Optional[str] = None
    account_id: Optional[str] = None
    practice: bool = True
    instruments: list = field(default_factory=lambda: ["EURUSD", "GBPUSD"])


_config = LiveConfig()


def set_config(api_key, account_id, practice, instruments):
    global _config
    _config = LiveConfig(api_key=api_key or None, account_id=account_id or None,
                          practice=practice, instruments=instruments or ["EURUSD", "GBPUSD"])
    return status()


def status():
    return {
        "configured": bool(_config.api_key),
        "practice": _config.practice,
        "instruments": _config.instruments,
        "kill_zones_ny": KILL_ZONES_NY,
        "scope_note": (
            "Daily-bar setup detection only (reuses the verified backtest engine on the "
            "latest OANDA daily candles). Intraday 5m/15m execution port is not implemented "
            "yet -- see CLAUDE.md step 3."
        ),
    }


def check_now():
    """Fetch latest daily candles per configured instrument and report any
    setup armed within the last few bars. Returns NOT_CONFIGURED if no API
    key has been set."""
    if not _config.api_key:
        return {"status": "NOT_CONFIGURED",
                "message": "No OANDA API key configured. POST /api/live/config to set one."}

    client = OandaClient(api_key=_config.api_key, account_id=_config.account_id or "",
                          practice=_config.practice)
    results = []
    for instrument in _config.instruments:
        try:
            candles = client.get_candles(instrument, granularity="D", count=120)
        except OandaError as e:
            results.append({"instrument": instrument, "error": str(e)})
            continue

        complete = [c for c in candles if c["complete"]]
        bars = [_CandleBar(c) for c in complete]
        armed = _scan_for_fresh_setup(bars, instrument)
        results.append({"instrument": instrument, "armed_setups": armed})

    return {"status": "OK", "results": results}


class _CandleBar:
    """Adapts an OANDA candle dict to the engine's Bar interface (.date/.o/.h/.l/.c)."""
    def __init__(self, c):
        self.date = c["date"]
        self.o = c["open"]
        self.h = c["high"]
        self.l = c["low"]
        self.c = c["close"]


def _scan_for_fresh_setup(bars, instrument, lookback_bars=3):
    """Re-run the verified sweep detection on only the tail of the series,
    to see if a setup armed within the last `lookback_bars` closes."""
    n = len(bars)
    if n < 10:
        return []
    swings = find_fractal_swings(bars)
    highs_sorted = [s for s in swings if s.kind == "high"]
    lows_sorted = [s for s in swings if s.kind == "low"]
    armed = []

    for i in range(max(3, n - lookback_bars), n):
        confirmed_lows = [s for s in lows_sorted if s.idx + 1 <= i and not s.swept]
        confirmed_highs = [s for s in highs_sorted if s.idx + 1 <= i and not s.swept]

        if confirmed_lows:
            ref_low = confirmed_lows[-1]
            if bars[i].l < ref_low.price and bars[i].c > ref_low.price:
                trend = trend_state_at(swings, i)
                prior_highs = [s for s in highs_sorted if s.idx <= i]
                if prior_highs:
                    t = try_bullish_setup(bars, i, ref_low, prior_highs[-1], instrument, trend)
                    if t:
                        armed.append(_trade_to_alert(t))

        if confirmed_highs:
            ref_high = confirmed_highs[-1]
            if bars[i].h > ref_high.price and bars[i].c < ref_high.price:
                trend = trend_state_at(swings, i)
                prior_lows = [s for s in lows_sorted if s.idx <= i]
                if prior_lows:
                    t = try_bearish_setup(bars, i, ref_high, prior_lows[-1], instrument, trend)
                    if t:
                        armed.append(_trade_to_alert(t))

    return armed


def _trade_to_alert(t):
    return {
        "instrument": t.instrument,
        "direction": t.direction,
        "bias_aligned": t.bias_aligned,
        "sweep_date": t.sweep_date,
        "sweep_price": round(t.sweep_price, 5),
        "mss_date": t.mss_date,
        "mss_price": round(t.mss_price, 5),
        "entry_zone_high": round(t.entry_price, 5),
        "stop": round(t.stop, 5),
        "target_2r": round(t.target_2r, 5),
        "target_3r": round(t.target_3r, 5),
    }
