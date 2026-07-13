import asyncio
import json
import os
import queue
import sys

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import engine_adapter  # noqa: E402
import journal  # noqa: E402
import live_monitor  # noqa: E402
import replay  # noqa: E402
from alert_bus import bus  # noqa: E402

app = FastAPI(title="ICT Alert Tool API")

@app.on_event("startup")
def _start_poller():
    live_monitor.start_background_poller()


_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
_allowed_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/instruments")
def instruments():
    return list(engine_adapter.INSTRUMENT_FILES.keys())


@app.get("/api/summary")
def summary():
    return engine_adapter.get_summary()


@app.get("/api/trades")
def trades(instrument: str = Query(None), bias_aligned: bool = Query(None)):
    all_trades = engine_adapter.get_all_trades()
    if instrument:
        instrument = instrument.upper()
        if instrument not in engine_adapter.INSTRUMENT_FILES:
            raise HTTPException(404, f"unknown instrument {instrument}")
        all_trades = [t for t in all_trades if t.instrument == instrument]
    if bias_aligned is not None:
        all_trades = [t for t in all_trades if t.bias_aligned == bias_aligned]
    return [engine_adapter.trade_to_json(t) for t in all_trades]


@app.get("/api/candles/{instrument}")
def candles(instrument: str):
    instrument = instrument.upper()
    if instrument not in engine_adapter.INSTRUMENT_FILES:
        raise HTTPException(404, f"unknown instrument {instrument}")
    bars = engine_adapter.get_bars(instrument)
    return engine_adapter.bars_to_json(bars)


@app.get("/api/verification")
def verification():
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         "verification_report.md")
    if not os.path.exists(path):
        raise HTTPException(404, "verification report not generated yet -- run verify_backtest.py")
    with open(path) as f:
        return {"report_markdown": f.read()}


class LiveConfigRequest(BaseModel):
    api_key: str = ""
    account_id: str = ""
    practice: bool = True
    instruments: list[str] = ["EURUSD", "GBPUSD"]


@app.get("/api/live/instruments")
def live_instruments():
    """Full set of instruments the Live Monitor can watch via OANDA. Only
    EURUSD/GBPUSD (in engine_adapter.INSTRUMENT_FILES) have verified
    backtest history -- everything else here is live-only until real
    historical data is available."""
    from oanda_client import INSTRUMENT_MAP, INSTRUMENT_LABELS
    return [
        {"symbol": s, "label": INSTRUMENT_LABELS.get(s, s),
         "has_backtest": s in engine_adapter.INSTRUMENT_FILES}
        for s in INSTRUMENT_MAP
    ]


@app.get("/api/live/status")
def live_status():
    return live_monitor.status()


@app.post("/api/live/config")
def live_config(req: LiveConfigRequest):
    return live_monitor.set_config(req.api_key, req.account_id, req.practice, req.instruments)


@app.post("/api/live/check")
def live_check():
    return live_monitor.check_now()


@app.get("/api/live/journal/candles/{instrument}")
def journal_candles(instrument: str, limit: int = Query(500, le=5000)):
    """Persisted record of every live daily candle the scan has fetched for
    this instrument -- the market's actual movement over time, independent
    of the in-memory SSE feed (which is lost on restart)."""
    return journal.get_candle_history(instrument.upper(), limit=limit)


@app.get("/api/live/journal/alerts")
def journal_alerts(instrument: str = Query(None), limit: int = Query(200, le=2000)):
    """Persisted record of every alert the live scan has produced (armed/
    entry/stop/target/expired), across restarts."""
    return journal.get_alert_history(instrument.upper() if instrument else None, limit=limit)


class ReplayRequest(BaseModel):
    instrument: str
    speed_ms: int = 150


@app.post("/api/replay/start")
def replay_start(req: ReplayRequest):
    instrument = req.instrument.upper()
    if instrument not in engine_adapter.INSTRUMENT_FILES:
        raise HTTPException(404, f"unknown instrument {instrument}")
    return replay.start_replay(instrument, req.speed_ms)


@app.post("/api/replay/stop")
def replay_stop(req: ReplayRequest):
    return replay.stop_replay(req.instrument.upper())


@app.get("/api/alerts/stream")
async def alerts_stream():
    q = bus.subscribe()

    async def gen():
        try:
            while True:
                try:
                    item = await asyncio.to_thread(q.get, True, 15.0)
                    yield f"data: {json.dumps(item)}\n\n"
                except queue.Empty:
                    yield ": keepalive\n\n"
        finally:
            bus.unsubscribe(q)

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache", "X-Accel-Buffering": "no",
    })


@app.get("/api/health")
def health():
    return {"status": "ok"}
