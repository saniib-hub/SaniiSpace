# Backtest Verification Report

**Verdict: PASS -- every trade's sweep/MSS/displacement/OTE-entry/stop/target/exit was independently re-derived from the raw OHLC bars and matched exactly.**

Note: a trade count of 4 per instrument can produce fewer than 4 distinct `(direction, entry_date)` pairs in the exhaustive re-scan comparison below, because the engine emits one row per bias-alignment variant even when two setups share the same entry date (e.g. two swings that both resolve to the same OTE entry bar).

## EURUSD: per-trade consistency check
Checked 4 trades, 0 discrepancies found.

## EURUSD: exhaustive re-scan (all valid swing pairings, not just the greedy 'most recent' one)
Brute-force scan found 12 distinct (direction, entry_date) outcomes across all swing pairings vs 3 entries the engine actually reported.
  9 additional entry dates reachable under some swing pairing the greedy algorithm didn't pick:
    - long 2026-05-04
    - long 2026-05-14
    - long 2026-06-02
    - long 2026-06-03
    - short 2026-04-01
    - short 2026-05-06
    - short 2026-05-25
    - short 2026-06-02
    - short 2026-06-11
  These are NOT bugs: the engine deliberately uses only the most recent confirmed, not-yet-swept swing as its reference (one setup per swing, no re-use/overlap), which is the standard ICT rule (a swing is only valid liquidity once). The extras above come from pairing a sweep with an older or already-used reference swing, which the strategy's own rules exclude.

## GBPUSD: per-trade consistency check
Checked 4 trades, 0 discrepancies found.

## GBPUSD: exhaustive re-scan (all valid swing pairings, not just the greedy 'most recent' one)
Brute-force scan found 21 distinct (direction, entry_date) outcomes across all swing pairings vs 3 entries the engine actually reported.
  18 additional entry dates reachable under some swing pairing the greedy algorithm didn't pick:
    - long 2026-04-30
    - long 2026-05-04
    - long 2026-05-12
    - long 2026-05-14
    - long 2026-05-27
    - long 2026-05-28
    - long 2026-06-04
    - long 2026-06-12
    - short 2026-04-09
    - short 2026-05-20
    - short 2026-05-25
    - short 2026-06-04
    - short 2026-06-05
    - short 2026-06-09
    - short 2026-06-11
    - short 2026-07-02
    - short 2026-07-07
    - short 2026-07-08
  These are NOT bugs: the engine deliberately uses only the most recent confirmed, not-yet-swept swing as its reference (one setup per swing, no re-use/overlap), which is the standard ICT rule (a swing is only valid liquidity once). The extras above come from pairing a sweep with an older or already-used reference swing, which the strategy's own rules exclude.


TOTAL DISCREPANCIES ACROSS ALL TRADES: 0
