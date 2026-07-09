import os
import sys

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import engine_adapter  # noqa: E402
import live_monitor  # noqa: E402

app = FastAPI(title="ICT Alert Tool API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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


@app.get("/api/live/status")
def live_status():
    return live_monitor.status()


@app.post("/api/live/config")
def live_config(req: LiveConfigRequest):
    return live_monitor.set_config(req.api_key, req.account_id, req.practice, req.instruments)


@app.post("/api/live/check")
def live_check():
    return live_monitor.check_now()


@app.get("/api/health")
def health():
    return {"status": "ok"}
