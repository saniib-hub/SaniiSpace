"""
Persistent record of live market movement and scan results.

This is NOT an order book or trade log -- nothing here places or records
real broker orders (see CLAUDE.md's safety section: this project is
decision-support only). It's a durable history of two things the live
in-memory pipeline otherwise loses on every restart:

  1. every daily candle the live monitor has actually fetched from OANDA
     for each watched instrument ("the market's movement")
  2. every alert the scan has produced (armed/entry/stop/target/expired),
     so past possible-entries and their outcomes can be reviewed later,
     not just watched live and forgotten
"""

import json
import os
import sqlite3
import threading

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "journal.db")
_lock = threading.Lock()


def _connect():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("""CREATE TABLE IF NOT EXISTS candles (
        instrument TEXT NOT NULL,
        date TEXT NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (instrument, date)
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        instrument TEXT NOT NULL,
        direction TEXT,
        date TEXT NOT NULL,
        setup_id TEXT,
        message TEXT,
        data TEXT,
        recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_instrument ON alerts (instrument)")
    conn.commit()
    return conn


_conn = _connect()


def record_candle(instrument: str, bar: dict):
    """bar: {date, open, high, low, close, ...} -- extra keys (e.g. 'complete') ignored."""
    with _lock:
        _conn.execute(
            "INSERT OR REPLACE INTO candles (instrument, date, open, high, low, close) VALUES (?,?,?,?,?,?)",
            (instrument, bar["date"], bar["open"], bar["high"], bar["low"], bar["close"]),
        )
        _conn.commit()


def record_alert(alert: dict):
    """alert: the same dict shape alert_bus.alert_to_dict() produces."""
    with _lock:
        _conn.execute(
            "INSERT INTO alerts (type, instrument, direction, date, setup_id, message, data) "
            "VALUES (?,?,?,?,?,?,?)",
            (alert["type"], alert["instrument"], alert.get("direction", ""), alert["date"],
             alert.get("setup_id", ""), alert.get("message", ""), json.dumps(alert.get("data", {}))),
        )
        _conn.commit()


def get_candle_history(instrument: str, limit: int = 500) -> list[dict]:
    with _lock:
        rows = _conn.execute(
            "SELECT date, open, high, low, close, recorded_at FROM candles "
            "WHERE instrument = ? ORDER BY date DESC LIMIT ?",
            (instrument, limit),
        ).fetchall()
    return [{"date": r[0], "open": r[1], "high": r[2], "low": r[3], "close": r[4], "recorded_at": r[5]}
            for r in reversed(rows)]


def get_alert_history(instrument: str = None, limit: int = 200) -> list[dict]:
    with _lock:
        if instrument:
            rows = _conn.execute(
                "SELECT type, instrument, direction, date, setup_id, message, data, recorded_at "
                "FROM alerts WHERE instrument = ? ORDER BY id DESC LIMIT ?",
                (instrument, limit),
            ).fetchall()
        else:
            rows = _conn.execute(
                "SELECT type, instrument, direction, date, setup_id, message, data, recorded_at "
                "FROM alerts ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
    return [{"type": r[0], "instrument": r[1], "direction": r[2], "date": r[3], "setup_id": r[4],
              "message": r[5], "data": json.loads(r[6]) if r[6] else {}, "recorded_at": r[7]}
             for r in rows]
