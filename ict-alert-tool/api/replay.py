"""Background replay runner: feeds historical bars through AlertEngine at a
configurable pace and publishes each resulting Alert to alert_bus, so the
exact same pipeline that would run live can be watched firing in the
browser without needing an OANDA key."""

import threading
import time

from alert_bus import bus, alert_to_dict
from alert_engine import AlertEngine
from engine_adapter import get_bars

_runs: dict[str, dict] = {}
_lock = threading.Lock()


def _run(instrument: str, speed_ms: int, stop_event: threading.Event):
    bars = get_bars(instrument)
    engine = AlertEngine(instrument)
    bus.publish({"type": "replay_status", "instrument": instrument, "date": "",
                 "direction": "", "setup_id": "", "message": f"Replay started for {instrument}",
                 "data": {"status": "started", "total_bars": len(bars)}})
    for idx, b in enumerate(bars):
        if stop_event.is_set():
            bus.publish({"type": "replay_status", "instrument": instrument, "date": b.date,
                         "direction": "", "setup_id": "", "message": f"Replay stopped for {instrument}",
                         "data": {"status": "stopped"}})
            return
        alerts = engine.push_bar(b)
        bus.publish({"type": "replay_tick", "instrument": instrument, "date": b.date,
                     "direction": "", "setup_id": "", "message": "",
                     "data": {"index": idx, "total": len(bars), "close": b.c}})
        for a in alerts:
            bus.publish(alert_to_dict(a))
        if speed_ms > 0:
            time.sleep(speed_ms / 1000)
    for a in engine.finalize():
        bus.publish(alert_to_dict(a))
    bus.publish({"type": "replay_status", "instrument": instrument, "date": bars[-1].date if bars else "",
                 "direction": "", "setup_id": "", "message": f"Replay complete for {instrument}",
                 "data": {"status": "complete"}})


def start_replay(instrument: str, speed_ms: int) -> dict:
    with _lock:
        existing = _runs.get(instrument)
        if existing and existing["thread"].is_alive():
            return {"status": "already_running", "instrument": instrument}
        stop_event = threading.Event()
        t = threading.Thread(target=_run, args=(instrument, speed_ms, stop_event), daemon=True)
        _runs[instrument] = {"thread": t, "stop": stop_event}
        t.start()
    return {"status": "started", "instrument": instrument}


def stop_replay(instrument: str) -> dict:
    with _lock:
        existing = _runs.get(instrument)
        if not existing or not existing["thread"].is_alive():
            return {"status": "not_running", "instrument": instrument}
        existing["stop"].set()
    return {"status": "stopping", "instrument": instrument}
