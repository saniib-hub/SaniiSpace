"""
Live monitor: polls OANDA for fresh daily candles and feeds them through the
same AlertEngine used by the demo replay (verified in test_alert_engine.py),
publishing every ARMED/ENTRY/STOP/TARGET event to alert_bus exactly like a
replay does -- the Alerts tab doesn't need to know the difference.

Honest scope note: this operates on daily candles only. It does NOT
implement the full intraday (5m/15m execution + kill-zone-precise timing)
port described in CLAUDE.md step 3 -- that is real, separate work (different
bar granularity, session/kill-zone time filters at the bar level) that
hasn't been done yet. Until that port exists, a background poller here can
tell you "a daily setup just armed as of today's close," not "arm 30-60
minutes before an intraday entry" the way the original spec asked for.

Requires a real OANDA API key to do anything -- with no key configured,
check_now() returns NOT_CONFIGURED and the background poller stays idle.
"""

import os
import sys
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from alert_bus import bus, alert_to_dict  # noqa: E402
from alert_engine import AlertEngine  # noqa: E402
from oanda_client import OandaClient, OandaError  # noqa: E402

KILL_ZONES_NY = [
    {"name": "London", "start": "03:00", "end": "04:00"},
    {"name": "New York", "start": "08:00", "end": "09:00"},
]
POLL_INTERVAL_SECONDS = 300


@dataclass
class LiveConfig:
    api_key: Optional[str] = None
    account_id: Optional[str] = None
    practice: bool = True
    instruments: list = field(default_factory=lambda: ["EURUSD", "GBPUSD"])


_config = LiveConfig()
_engines: dict[str, AlertEngine] = {}
_seen_dates: dict[str, set] = {}
_lock = threading.Lock()


def set_config(api_key, account_id, practice, instruments):
    global _config
    with _lock:
        _config = LiveConfig(api_key=api_key or None, account_id=account_id or None,
                              practice=practice, instruments=instruments or ["EURUSD", "GBPUSD"])
    return status()


def status():
    return {
        "configured": bool(_config.api_key),
        "practice": _config.practice,
        "instruments": _config.instruments,
        "kill_zones_ny": KILL_ZONES_NY,
        "in_kill_zone_now": _in_kill_zone(),
        "scope_note": (
            "Daily-bar setup detection only (reuses the same verified AlertEngine the demo "
            "replay uses, fed with fresh OANDA daily candles). Intraday 5m/15m execution port "
            "is not implemented yet -- see CLAUDE.md step 3."
        ),
    }


def _in_kill_zone(now_ny: Optional[datetime] = None) -> bool:
    now_ny = now_ny or datetime.now(ZoneInfo("America/New_York"))
    hm = now_ny.strftime("%H:%M")
    return any(z["start"] <= hm <= z["end"] for z in KILL_ZONES_NY)


class _CandleBar:
    """Adapts an OANDA candle dict to the engine's Bar interface (.date/.o/.h/.l/.c)."""
    def __init__(self, c):
        self.date = c["date"]
        self.o = c["open"]
        self.h = c["high"]
        self.l = c["low"]
        self.c = c["close"]


WIN_RATE_NOTE = (
    "Entry/stop/target levels come from the same sweep-→MSS-→displacement-→OTE "
    "pattern verified in the backtest: 75.0% win rate (6/8) at the 2R target across "
    "EUR/USD + GBP/USD, ~100 days (see the Verification tab). That is a small historical "
    "sample, not a guarantee -- always use the stop."
)


def check_now():
    """Fetch latest daily candles per configured instrument, feed any bars
    not yet processed into that instrument's persistent AlertEngine, publish
    the resulting alerts (unfiltered -- full history for the Alerts tab), and
    return only the currently-pending possible entries with their stop/target
    levels for the scan result. Returns NOT_CONFIGURED if no API key is set."""
    if not _config.api_key:
        return {"status": "NOT_CONFIGURED",
                "message": "No OANDA API key configured. POST /api/live/config to set one."}

    client = OandaClient(api_key=_config.api_key, account_id=_config.account_id or "",
                          practice=_config.practice)
    results = []
    for instrument in _config.instruments:
        try:
            candles = client.get_candles(instrument, granularity="D", count=200)
        except OandaError as e:
            results.append({"instrument": instrument, "error": str(e)})
            continue

        with _lock:
            engine = _engines.setdefault(instrument, AlertEngine(instrument))
            seen = _seen_dates.setdefault(instrument, set())

        for c in candles:
            if not c["complete"] or c["date"] in seen:
                continue
            seen.add(c["date"])
            for a in engine.push_bar(_CandleBar(c)):
                bus.publish(alert_to_dict(a))

        results.append({"instrument": instrument, "possible_entries": engine.get_possible_entries(),
                         "bars_seen": len(seen)})

    return {"status": "OK", "results": results, "note": WIN_RATE_NOTE}


_poller_started = False


def start_background_poller():
    """Idempotent: starts one daemon thread that wakes up periodically and
    calls check_now() whenever both (a) live monitoring is configured and
    (b) we're currently inside a kill-zone window. Safe to call at import
    time -- it stays idle doing nothing until configured."""
    global _poller_started
    if _poller_started:
        return
    _poller_started = True

    def _loop():
        while True:
            try:
                if _config.api_key and _in_kill_zone():
                    check_now()
            except Exception:
                pass  # never let a transient OANDA/network error kill the poller
            time.sleep(POLL_INTERVAL_SECONDS)

    threading.Thread(target=_loop, daemon=True).start()
