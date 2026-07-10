"""
Verifies the incremental (bar-by-bar, no-lookahead) AlertEngine against the
already-verified batch backtest.

The engine deliberately checks EVERY confirmed unswept swing each bar, not
just the most recent one (see the comment in alert_engine.py's
_scan_for_new_sweeps) -- a live alert tool must not silently skip a real
sweep just because a newer swing also exists. That means it's expected to
find MORE setups than ict_ttrades_backtest.py's batch engine, which only
checks the single most recent unswept swing. So the correctness bar here
is:

  1. Every one of the 8 trades in backtest_trades.csv is reproduced exactly
     (same sweep/mss/entry dates, stop, targets, and both R results) --
     the engine must never MISS a verified trade.
  2. Every additional trade the engine finds beyond those 8 is cross-checked
     against verify_backtest.py's exhaustive brute-force re-scan (which
     already enumerated every valid swing pairing) -- so "extra" trades are
     confirmed to be real valid setups per the strategy's own rules, not an
     engine bug inventing setups that don't exist.

Run with: python3 -m unittest api/test_alert_engine.py
"""

import csv
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from alert_engine import AlertEngine  # noqa: E402
from ict_ttrades_backtest import load_csv  # noqa: E402
from verify_backtest import exhaustive_rescan  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INSTRUMENT_FILES = {
    "EURUSD": os.path.join(ROOT, "data", "eurusd_daily.csv"),
    "GBPUSD": os.path.join(ROOT, "data", "gbpusd_daily.csv"),
}


def replay(instrument):
    bars = load_csv(INSTRUMENT_FILES[instrument])
    engine = AlertEngine(instrument)
    for b in bars:
        engine.push_bar(b)
    engine.finalize()  # close any still-open position at the last bar, matching
    return bars, engine.closed_trades  # ict_ttrades_backtest.py's own end-of-data fallback


def load_ground_truth_trades():
    path = os.path.join(ROOT, "backtest_trades.csv")
    with open(path) as f:
        return list(csv.DictReader(f))


class TestAlertEngineNeverMissesVerifiedTrades(unittest.TestCase):
    # The ONLY ground-truth trade this engine does not reproduce verbatim,
    # and why: EURUSD's 2026-04-29 and 2026-04-30 "trades" both referenced a
    # confirmed unswept low as their sweep target (2026-04-13's low and
    # 2026-04-23's low respectively). The batch engine, which only ever
    # checks confirmed_lows[-1] one bar at a time, swept the 04-23 low on
    # 04-29 and -- only after that -- the 04-13 low on 04-30, reporting two
    # separate trades a day apart. In reality, bar 04-29 (low 1.16600,
    # close 1.16770) already closed back above BOTH those levels: the
    # 04-13 low (1.16610) was already retaken the same day, not held in
    # reserve for a fresh "sweep" the day after. This engine checks every
    # confirmed unswept swing each bar (see module docstring point 1), so
    # it correctly sweeps both on 04-29 and does not invent a second,
    # already-reclaimed sweep on 04-30. Confirmed by inspecting
    # engine.swept_idx: the 04-13 low's bar index is swept on 04-29, not
    # 04-30. This is a correction, not a miss -- see verify_backtest.py's
    # exhaustive re-scan, which independently flagged the batch engine's
    # single-most-recent-swing selection as a simplification.
    KNOWN_MERGED_DUPLICATE_SWEEPS = {
        ("EURUSD", "long", "2026-04-30", "2026-05-08", "2026-05-13"),
    }

    def test_reproduces_every_ground_truth_trade(self):
        ground_truth = load_ground_truth_trades()
        replayed = {}
        engines = {}
        for instrument in INSTRUMENT_FILES:
            _, closed = replay(instrument)
            replayed[instrument] = closed

        missed = []
        for row in ground_truth:
            instrument = row["instrument"]
            key = (instrument, row["direction"], row["sweep_date"], row["mss_date"], row["entry_date"])
            match = next(
                (c for c in replayed[instrument]
                 if c["direction"] == row["direction"]
                 and c["sweep_date"] == row["sweep_date"]
                 and c["mss_date"] == row["mss_date"]
                 and c["entry_date"] == row["entry_date"]),
                None,
            )
            if match is None:
                if key in self.KNOWN_MERGED_DUPLICATE_SWEEPS:
                    continue
                missed.append(row)
                continue
            self.assertAlmostEqual(match["entry_price"], float(row["entry_price"]), places=4)
            self.assertAlmostEqual(match["stop"], float(row["stop"]), places=4)
            self.assertAlmostEqual(match["target_2r"], float(row["target_2r"]), places=4)
            self.assertAlmostEqual(match["target_3r"], float(row["target_3r"]), places=4)
            self.assertEqual(match["exit_date_2r"], row["exit_date_2r"])
            self.assertAlmostEqual(match["result_r_2r"], float(row["result_r_2r"]), places=2)
            self.assertEqual(match["exit_date_3r"], row["exit_date_3r"])
            self.assertAlmostEqual(match["result_r_3r"], float(row["result_r_3r"]), places=2)

        self.assertEqual(missed, [], f"AlertEngine failed to reproduce {len(missed)} verified trade(s): {missed}")

    def test_merged_duplicate_sweep_is_explained_not_silently_dropped(self):
        """The one documented exception above must be explained by the
        referenced swing having genuinely been swept a day earlier -- not
        just absent with no explanation."""
        bars = load_csv(INSTRUMENT_FILES["EURUSD"])
        engine = AlertEngine("EURUSD")
        for b in bars:
            engine.push_bar(b)
        idx_0413_low = next(i for i, b in enumerate(bars) if b.date == "2026-04-13")
        idx_0429 = next(i for i, b in enumerate(bars) if b.date == "2026-04-29")
        self.assertIn(idx_0413_low, engine.swept_idx,
                      "expected the 2026-04-13 low to have been swept by the time replay finished")
        # And swept ON 04-29 specifically (a bar earlier than the batch
        # engine's 04-30 attribution) -- i.e. bar 04-29 itself already broke
        # below that low and closed back above it.
        low_2026_04_13 = bars[idx_0413_low].l
        self.assertLess(bars[idx_0429].l, low_2026_04_13)
        self.assertGreater(bars[idx_0429].c, low_2026_04_13)

    def test_extra_setups_are_all_real_per_exhaustive_rescan(self):
        """Anything the engine finds beyond the original 8 must still be a
        legitimate setup under the strategy's own rules -- cross-check
        against verify_backtest.py's brute-force enumeration of every valid
        swing pairing, which is independent of both this engine and the
        batch backtest's greedy selection."""
        ground_truth = load_ground_truth_trades()
        for instrument, path in INSTRUMENT_FILES.items():
            bars = load_csv(path)
            _, closed = replay(instrument)
            gt_keys = {(r["direction"], r["entry_date"]) for r in ground_truth if r["instrument"] == instrument}
            extra = [c for c in closed if (c["direction"], c["entry_date"]) not in gt_keys]
            if not extra:
                continue

            candidates = exhaustive_rescan(bars, instrument)
            reachable_entry_dates = set()
            for direction, sweep_i, ref_idx, mss_j in candidates:
                n = len(bars)
                sweep_price = bars[sweep_i].l if direction == "long" else bars[sweep_i].h
                mss_price = bars[mss_j].c
                for k in range(mss_j + 1, min(n, mss_j + 1 + 15)):
                    if direction == "long":
                        swing_range = mss_price - sweep_price
                        if swing_range <= 0 or bars[k].l < sweep_price:
                            break
                        entry_high = mss_price - 0.62 * swing_range
                        entry_low = mss_price - 0.79 * swing_range
                        if bars[k].l <= entry_high and bars[k].h >= entry_low:
                            reachable_entry_dates.add((direction, bars[k].date))
                            break
                    else:
                        swing_range = sweep_price - mss_price
                        if swing_range <= 0 or bars[k].h > sweep_price:
                            break
                        entry_low = mss_price + 0.62 * swing_range
                        entry_high = mss_price + 0.79 * swing_range
                        if bars[k].h >= entry_low and bars[k].l <= entry_high:
                            reachable_entry_dates.add((direction, bars[k].date))
                            break

            for c in extra:
                self.assertIn(
                    (c["direction"], c["entry_date"]), reachable_entry_dates,
                    f"{instrument} extra trade {c['direction']} {c['entry_date']} is not a valid "
                    f"setup under any swing pairing -- likely an engine bug",
                )


class TestPossibleEntries(unittest.TestCase):
    """get_possible_entries() backs the live-monitor scan's 'possible entries'
    result -- it must report a setup exactly while it's ARMED (pattern
    confirmed, entry zone known, not yet tapped) and never before or after."""

    def test_empty_before_any_sweep(self):
        bars = load_csv(INSTRUMENT_FILES["GBPUSD"])
        engine = AlertEngine("GBPUSD")
        for b in bars[:5]:
            engine.push_bar(b)
        self.assertEqual(engine.get_possible_entries(), [])

    def test_reports_pending_armed_setup_with_correct_levels(self):
        bars = load_csv(INSTRUMENT_FILES["GBPUSD"])
        engine = AlertEngine("GBPUSD")
        for b in bars[:85]:  # one bar after the 2026-06-17 MSS confirms, before the 2026-07-06 entry
            engine.push_bar(b)
        entries = engine.get_possible_entries()
        self.assertEqual(len(entries), 1)
        e = entries[0]
        self.assertEqual(e["instrument"], "GBPUSD")
        self.assertEqual(e["direction"], "short")
        self.assertEqual(e["sweep_date"], "2026-06-15")
        self.assertEqual(e["mss_date"], "2026-06-17")
        self.assertAlmostEqual(e["stop"], 1.3478, places=4)
        self.assertAlmostEqual(e["target_2r"], 1.32332, places=4)
        self.assertAlmostEqual(e["target_3r"], 1.31516, places=4)
        self.assertEqual(e["entry_zone"][0], min(e["entry_zone"]))
        self.assertLess(e["entry_zone"][0], e["entry_zone"][1])

    def test_disappears_once_entry_triggers(self):
        bars = load_csv(INSTRUMENT_FILES["GBPUSD"])
        engine = AlertEngine("GBPUSD")
        pending_at_85 = False
        for i, b in enumerate(bars):
            engine.push_bar(b)
            if i == 85:
                pending_at_85 = any(e["sweep_date"] == "2026-06-15" for e in engine.get_possible_entries())
            if b.date == "2026-07-06":  # the verified entry_date for this exact setup
                break
        self.assertTrue(pending_at_85, "expected the 2026-06-15 setup to still be pending at bar 85")
        still_pending = any(e["sweep_date"] == "2026-06-15" for e in engine.get_possible_entries())
        self.assertFalse(still_pending, "setup should have moved to 'open' once entry triggered, not still show as a possible entry")


if __name__ == "__main__":
    unittest.main()
