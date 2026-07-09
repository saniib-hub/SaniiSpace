"""
Incremental (bar-by-bar) alert engine.

ict_ttrades_backtest.py's run_backtest()/try_bullish_setup()/try_bearish_setup()
are *batch* functions: they see the whole bar series up front and use forward
lookahead windows to decide whether a trade happened. That's correct for a
backtest, but an alerting tool needs to fire the moment each stage happens,
bar by bar, without ever looking into the future:

    watching_mss  -- a sweep just occurred, waiting up to LOOKAHEAD_MSS bars
                     for a displacement MSS close
    armed         -- MSS confirmed: sweep+MSS+displacement all present, entry
                     zone/stop/targets are now known, waiting up to
                     LOOKAHEAD_ENTRY bars for price to tap the OTE zone
                     (this is the "30-60 min before entry" moment)
    open          -- entry zone tapped, watching for stop or target
    closed        -- stop or target (or max hold) reached

This module re-implements that same math (sweep/MSS/displacement/OTE/stop/
target formulas are copied verbatim from ict_ttrades_backtest.py, not
imported, so the two can be independently cross-checked) as a state machine
that only ever looks at bars up to "now".

Two deliberate differences from the batch engine, both required for a live
alert tool and both covered by test_alert_engine.py:

1. Every confirmed, not-yet-swept swing is checked against each new bar, not
   just the single most recent one. The batch engine's run_backtest() only
   checks confirmed_lows[-1]/confirmed_highs[-1] each bar (a backtest
   simplification -- see verification_report.md's exhaustive re-scan, which
   found real setups that choice skips). Missing a real sweep because a
   newer swing also exists is not acceptable here.

2. The opposite-side reference swing used to confirm MSS (e.g. the prior
   high a bearish setup needs price to close below) is bounded by
   `idx <= sweep_i` (same bound ict_ttrades_backtest.py uses) but is only
   actually read, and then frozen, on the first bar processed *after* the
   sweep (sweep_i + 1) rather than at the sweep bar itself. The batch
   engine reads it at sweep_i using `s.idx <= i` with no confirmation-lag
   check, which lets it use a swing whose fractal status depends on the
   sweep bar's own right-hand neighbor -- a bar that, in real time, hasn't
   happened yet at the moment of the sweep. Waiting exactly one bar reaches
   the identical reference honestly (by sweep_i + 1 every candidate with
   idx <= sweep_i is confirmable), then freezes it -- it does not keep
   drifting to newer swings as the MSS search continues, matching the
   batch engine's own fixed-at-selection-time behavior.
"""

import os
import sys
from dataclasses import dataclass, field
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ict_ttrades_backtest import (  # noqa: E402
    Bar, Swing, find_fractal_swings, trend_state_at, avg_body,
    LOOKAHEAD_MSS, LOOKAHEAD_ENTRY, MAX_HOLD, DISPLACEMENT_MULT, STOP_BUFFER_FRAC,
)

ALERT_TYPES = (
    "armed", "entry_triggered", "invalidated", "expired",
    "stop_hit", "target_2r_hit", "target_3r_hit", "closed_max_hold",
)


@dataclass
class Alert:
    type: str
    instrument: str
    direction: str
    date: str
    setup_id: str
    message: str
    data: dict = field(default_factory=dict)


@dataclass
class _Watch:
    setup_id: str
    direction: str
    sweep_i: int
    sweep_date: str
    sweep_price: float
    deadline_idx: int
    ref_price: Optional[float] = None  # frozen the first bar this watch is processed; see _advance_watching


@dataclass
class _Armed:
    setup_id: str
    direction: str
    sweep_i: int
    sweep_date: str
    sweep_price: float
    mss_i: int
    mss_date: str
    mss_price: float
    entry_price: float
    entry_low: float
    entry_high: float
    stop: float
    target_2r: float
    target_3r: float
    bias_aligned: bool
    deadline_idx: int


@dataclass
class _Open:
    setup_id: str
    direction: str
    sweep_date: str
    mss_date: str
    entry_date: str
    entry_price: float
    stop: float
    target_2r: float
    target_3r: float
    bias_aligned: bool
    opened_idx: int
    hit_2r: bool = False
    hit_3r: bool = False
    exit_date_2r: str = ""
    exit_price_2r: Optional[float] = None
    result_r_2r: Optional[float] = None
    exit_date_3r: str = ""
    exit_price_3r: Optional[float] = None
    result_r_3r: Optional[float] = None


class AlertEngine:
    """One instance tracks one instrument's state across incremental bar feeds."""

    def __init__(self, instrument: str):
        self.instrument = instrument
        self.bars: list[Bar] = []
        self.swept_idx: set[int] = set()
        self.watching: list[_Watch] = []
        self.armed: list[_Armed] = []
        self.open: list[_Open] = []
        self.closed_trades: list[dict] = []
        self._seq = 0

    def _next_id(self, prefix: str) -> str:
        self._seq += 1
        return f"{self.instrument}-{prefix}-{self._seq}"

    def push_bar(self, bar: Bar) -> list[Alert]:
        self.bars.append(bar)
        i = len(self.bars) - 1
        alerts: list[Alert] = []

        alerts += self._advance_open(i)
        alerts += self._advance_armed(i)
        alerts += self._advance_watching(i)
        alerts += self._scan_for_new_sweeps(i)

        return alerts

    def finalize(self) -> list[Alert]:
        """Force-close any still-open positions using the last bar's close.

        NOT part of live operation -- a live engine should never pretend it
        knows data has "ended," it should just leave the position open until
        real data resolves it. This exists only for replay/backtest-style
        callers (tests, the demo replay endpoint) that want a clean final
        state at the end of a finite bar series, matching
        ict_ttrades_backtest.py's own end-of-data fallback in simulate_exit()
        (which clamps to the last available bar rather than leaving results
        as None)."""
        if not self.bars:
            return []
        i = len(self.bars) - 1
        last = self.bars[i]
        out = []
        for pos in self.open:
            long_ = pos.direction == "long"
            risk = abs(pos.entry_price - pos.stop)
            if not pos.hit_2r:
                r = (last.c - pos.entry_price) / risk if long_ else (pos.entry_price - last.c) / risk
                pos.hit_2r = True
                pos.exit_date_2r, pos.exit_price_2r, pos.result_r_2r = last.date, last.c, round(r, 2)
                out.append(Alert("closed_max_hold", self.instrument, pos.direction, last.date,
                                  pos.setup_id, f"{self.instrument} {pos.direction} still open at end of "
                                  f"available data ({last.c:.5f}), 2R target unresolved",
                                  {"close": last.c, "target": "2r"}))
            if not pos.hit_3r:
                r = (last.c - pos.entry_price) / risk if long_ else (pos.entry_price - last.c) / risk
                pos.hit_3r = True
                pos.exit_date_3r, pos.exit_price_3r, pos.result_r_3r = last.date, last.c, round(r, 2)
                out.append(Alert("closed_max_hold", self.instrument, pos.direction, last.date,
                                  pos.setup_id, f"{self.instrument} {pos.direction} still open at end of "
                                  f"available data ({last.c:.5f}), 3R target unresolved",
                                  {"close": last.c, "target": "3r"}))
            self._record_close(pos)
        self.open = []
        return out

    # -- stage 3->4: open position hits stop/target/max-hold -------------
    def _advance_open(self, i: int) -> list[Alert]:
        out = []
        still_open = []
        bar = self.bars[i]
        for pos in self.open:
            if i < pos.opened_idx:
                still_open.append(pos)
                continue
            long_ = pos.direction == "long"
            risk = abs(pos.entry_price - pos.stop)
            hit_stop = (bar.l <= pos.stop) if long_ else (bar.h >= pos.stop)

            if hit_stop and not (pos.hit_2r and pos.hit_3r):
                if not pos.hit_2r:
                    out.append(Alert("stop_hit", self.instrument, pos.direction, bar.date,
                                      pos.setup_id, f"{self.instrument} {pos.direction} STOP hit at {pos.stop:.5f} "
                                      f"(2R target abandoned)", {"stop": pos.stop, "target": "2r"}))
                    pos.hit_2r = True
                    pos.exit_date_2r, pos.exit_price_2r, pos.result_r_2r = bar.date, pos.stop, -1.0
                if not pos.hit_3r:
                    out.append(Alert("stop_hit", self.instrument, pos.direction, bar.date,
                                      pos.setup_id, f"{self.instrument} {pos.direction} STOP hit at {pos.stop:.5f} "
                                      f"(3R target abandoned)", {"stop": pos.stop, "target": "3r"}))
                    pos.hit_3r = True
                    pos.exit_date_3r, pos.exit_price_3r, pos.result_r_3r = bar.date, pos.stop, -1.0
                self._record_close(pos)
                continue

            if not pos.hit_2r:
                hit = (bar.h >= pos.target_2r) if long_ else (bar.l <= pos.target_2r)
                if hit:
                    out.append(Alert("target_2r_hit", self.instrument, pos.direction, bar.date,
                                      pos.setup_id, f"{self.instrument} {pos.direction} 2R TARGET hit at "
                                      f"{pos.target_2r:.5f}", {"target_2r": pos.target_2r}))
                    pos.hit_2r = True
                    r = (pos.target_2r - pos.entry_price) / risk if long_ \
                        else (pos.entry_price - pos.target_2r) / risk
                    pos.exit_date_2r, pos.exit_price_2r, pos.result_r_2r = bar.date, pos.target_2r, round(r, 2)
            if not pos.hit_3r:
                hit = (bar.h >= pos.target_3r) if long_ else (bar.l <= pos.target_3r)
                if hit:
                    out.append(Alert("target_3r_hit", self.instrument, pos.direction, bar.date,
                                      pos.setup_id, f"{self.instrument} {pos.direction} 3R TARGET hit at "
                                      f"{pos.target_3r:.5f}", {"target_3r": pos.target_3r}))
                    pos.hit_3r = True
                    r = (pos.target_3r - pos.entry_price) / risk if long_ \
                        else (pos.entry_price - pos.target_3r) / risk
                    pos.exit_date_3r, pos.exit_price_3r, pos.result_r_3r = bar.date, pos.target_3r, round(r, 2)

            if pos.hit_2r and pos.hit_3r:
                self._record_close(pos)
                continue

            if i >= pos.opened_idx + MAX_HOLD - 1:
                if not pos.hit_2r:
                    out.append(Alert("closed_max_hold", self.instrument, pos.direction, bar.date,
                                      pos.setup_id, f"{self.instrument} {pos.direction} closed at max hold "
                                      f"({bar.c:.5f}), 2R target never reached", {"close": bar.c, "target": "2r"}))
                    pos.hit_2r = True
                    r = (bar.c - pos.entry_price) / risk if long_ else (pos.entry_price - bar.c) / risk
                    pos.exit_date_2r, pos.exit_price_2r, pos.result_r_2r = bar.date, bar.c, round(r, 2)
                if not pos.hit_3r:
                    out.append(Alert("closed_max_hold", self.instrument, pos.direction, bar.date,
                                      pos.setup_id, f"{self.instrument} {pos.direction} closed at max hold "
                                      f"({bar.c:.5f}), 3R target never reached", {"close": bar.c, "target": "3r"}))
                    pos.hit_3r = True
                    r = (bar.c - pos.entry_price) / risk if long_ else (pos.entry_price - bar.c) / risk
                    pos.exit_date_3r, pos.exit_price_3r, pos.result_r_3r = bar.date, bar.c, round(r, 2)
                self._record_close(pos)
                continue

            still_open.append(pos)
        self.open = still_open
        return out

    def _record_close(self, pos: "_Open"):
        self.closed_trades.append({
            "instrument": self.instrument, "direction": pos.direction,
            "bias_aligned": pos.bias_aligned,
            "sweep_date": pos.sweep_date, "mss_date": pos.mss_date,
            "entry_date": pos.entry_date, "entry_price": pos.entry_price,
            "stop": pos.stop, "target_2r": pos.target_2r, "target_3r": pos.target_3r,
            "exit_date_2r": pos.exit_date_2r, "exit_price_2r": pos.exit_price_2r,
            "result_r_2r": pos.result_r_2r,
            "exit_date_3r": pos.exit_date_3r, "exit_price_3r": pos.exit_price_3r,
            "result_r_3r": pos.result_r_3r,
        })

    # -- stage 2->3: armed setup gets entered / invalidated / expires ----
    def _advance_armed(self, i: int) -> list[Alert]:
        out = []
        still_armed = []
        bar = self.bars[i]
        for a in self.armed:
            if i <= a.mss_i:
                still_armed.append(a)
                continue
            long_ = a.direction == "long"
            broke_back = (bar.l < a.sweep_price) if long_ else (bar.h > a.sweep_price)
            if broke_back:
                out.append(Alert("invalidated", self.instrument, a.direction, bar.date, a.setup_id,
                                  f"{self.instrument} {a.direction} setup invalidated -- price traded back "
                                  f"through the sweep extreme before entry", {}))
                continue
            tapped = (bar.l <= a.entry_high and bar.h >= a.entry_low) if long_ \
                else (bar.h >= a.entry_low and bar.l <= a.entry_high)
            if tapped:
                out.append(Alert("entry_triggered", self.instrument, a.direction, bar.date, a.setup_id,
                                  f"{self.instrument} {a.direction} ENTRY triggered at {a.entry_price:.5f} "
                                  f"(stop {a.stop:.5f}, 2R {a.target_2r:.5f}, 3R {a.target_3r:.5f})",
                                  {"entry_price": a.entry_price, "stop": a.stop,
                                   "target_2r": a.target_2r, "target_3r": a.target_3r}))
                self.open.append(_Open(a.setup_id, a.direction, a.sweep_date, a.mss_date, bar.date,
                                        a.entry_price, a.stop, a.target_2r, a.target_3r,
                                        a.bias_aligned, opened_idx=i))
                continue
            if i >= a.deadline_idx:
                out.append(Alert("expired", self.instrument, a.direction, bar.date, a.setup_id,
                                  f"{self.instrument} {a.direction} setup expired -- entry zone never tapped",
                                  {}))
                continue
            still_armed.append(a)
        self.armed = still_armed
        return out

    # -- stage 1->2: pending sweep gets its MSS confirmation --------------
    def _advance_watching(self, i: int) -> list[Alert]:
        out = []
        still_watching = []
        bar = self.bars[i]
        swings = find_fractal_swings(self.bars)
        highs_sorted = [s for s in swings if s.kind == "high"]
        lows_sorted = [s for s in swings if s.kind == "low"]

        for w in self.watching:
            if i <= w.sweep_i:
                still_watching.append(w)
                continue
            long_ = w.direction == "long"
            # Freeze the MSS reference exactly once, on the first bar
            # processed after the sweep (i == sweep_i + 1) -- by then every
            # swing with idx <= sweep_i is honestly confirmable (needs only
            # idx+1 <= i, and idx <= sweep_i < i), so this reaches the same
            # bound ict_ttrades_backtest.py uses (idx <= sweep_i) without
            # its 1-bar lookahead. It is never re-evaluated afterwards, so a
            # newer swing that forms later while still watching for MSS
            # cannot retroactively become the reference (see docstring pt. 2).
            if w.ref_price is None:
                if long_:
                    refs = [s for s in highs_sorted if s.idx <= w.sweep_i]
                else:
                    refs = [s for s in lows_sorted if s.idx <= w.sweep_i]
                if not refs:
                    continue  # no prior opposite-side swing ever existed -- drop, matches batch engine
                w.ref_price = refs[-1].price
            ref_price = w.ref_price
            mss_hit = (bar.c > ref_price) if long_ else (bar.c < ref_price)
            if mss_hit:
                body = abs(bar.c - bar.o)
                if body >= DISPLACEMENT_MULT * avg_body(self.bars, i):
                    mss_price = bar.c
                    if long_:
                        swing_range = mss_price - w.sweep_price
                    else:
                        swing_range = w.sweep_price - mss_price
                    if swing_range > 0:
                        if long_:
                            entry_high = mss_price - 0.62 * swing_range
                            entry_low = mss_price - 0.79 * swing_range
                            entry_price = entry_high
                            stop = w.sweep_price - STOP_BUFFER_FRAC * swing_range
                            target_2r = entry_price + 2 * (entry_price - stop)
                            target_3r = entry_price + 3 * (entry_price - stop)
                        else:
                            entry_low = mss_price + 0.62 * swing_range
                            entry_high = mss_price + 0.79 * swing_range
                            entry_price = entry_low
                            stop = w.sweep_price + STOP_BUFFER_FRAC * swing_range
                            target_2r = entry_price - 2 * (stop - entry_price)
                            target_3r = entry_price - 3 * (stop - entry_price)
                        trend = trend_state_at(find_fractal_swings(self.bars), i)
                        bias_aligned = (trend in ("bullish", "neutral")) if long_ \
                            else (trend in ("bearish", "neutral"))
                        setup_id = self._next_id("setup")
                        out.append(Alert(
                            "armed", self.instrument, w.direction, bar.date, setup_id,
                            f"{self.instrument} {w.direction.upper()} setup ARMED -- sweep {w.sweep_date} "
                            f"-> MSS {bar.date}. Watch entry zone "
                            f"[{min(entry_low, entry_high):.5f}, {max(entry_low, entry_high):.5f}], "
                            f"stop {stop:.5f}, targets {target_2r:.5f} / {target_3r:.5f}",
                            {"sweep_date": w.sweep_date, "sweep_price": w.sweep_price,
                             "mss_date": bar.date, "mss_price": mss_price,
                             "entry_low": entry_low, "entry_high": entry_high,
                             "entry_price": entry_price, "stop": stop,
                             "target_2r": target_2r, "target_3r": target_3r,
                             "bias_aligned": bias_aligned}))
                        self.armed.append(_Armed(setup_id, w.direction, w.sweep_i, w.sweep_date,
                                                  w.sweep_price, i, bar.date, mss_price,
                                                  entry_price, entry_low, entry_high, stop,
                                                  target_2r, target_3r, bias_aligned,
                                                  deadline_idx=i + LOOKAHEAD_ENTRY))
                    continue
            if i >= w.deadline_idx:
                continue  # silently expire -- no MSS ever came; not alert-worthy on its own
            still_watching.append(w)
        self.watching = still_watching
        return out

    # -- stage 0->1: fresh sweep of a confirmed swing ----------------------
    def _scan_for_new_sweeps(self, i: int) -> list[Alert]:
        if i < 3:
            return []
        swings = find_fractal_swings(self.bars)
        highs_sorted = [s for s in swings if s.kind == "high"]
        lows_sorted = [s for s in swings if s.kind == "low"]
        bar = self.bars[i]

        confirmed_lows = [s for s in lows_sorted if s.idx + 1 <= i and s.idx not in self.swept_idx]
        confirmed_highs = [s for s in highs_sorted if s.idx + 1 <= i and s.idx not in self.swept_idx]

        # Check EVERY confirmed, not-yet-swept swing against this bar -- not just
        # the most recent one. ict_ttrades_backtest.py's batch run_backtest() only
        # checks confirmed_lows[-1]/confirmed_highs[-1] (a deliberate backtest
        # simplification -- see verification_report.md's exhaustive re-scan,
        # which found real setups that greedy selection skips). A live alert tool
        # can't make that trade-off: a swing this bar sweeps through is real
        # liquidity taken, regardless of whether a newer swing also exists, and
        # missing it means missing a real setup. So every one of them spawns its
        # own independent watch.
        #
        # Two different swept swings on the same bar always resolve to an
        # identical downstream watch (sweep_price is the bar's own high/low,
        # not the swing's price, and _advance_watching re-evaluates the MSS
        # reference from direction + bar index alone) -- dedupe on
        # (direction, sweep bar) so that doesn't spam identical alerts twice.
        already_watching = {(w.direction, w.sweep_i) for w in self.watching}
        out = []
        for ref_low in confirmed_lows:
            if bar.l < ref_low.price and bar.c > ref_low.price:
                self.swept_idx.add(ref_low.idx)
                key = ("long", i)
                if key in already_watching:
                    continue
                already_watching.add(key)
                setup_id = self._next_id("watch")
                self.watching.append(_Watch(setup_id, "long", i, bar.date, bar.l,
                                             deadline_idx=i + LOOKAHEAD_MSS))

        for ref_high2 in confirmed_highs:
            if bar.h > ref_high2.price and bar.c < ref_high2.price:
                self.swept_idx.add(ref_high2.idx)
                key = ("short", i)
                if key in already_watching:
                    continue
                already_watching.add(key)
                setup_id = self._next_id("watch")
                self.watching.append(_Watch(setup_id, "short", i, bar.date, bar.h,
                                             deadline_idx=i + LOOKAHEAD_MSS))
        return out
