"""
ICT 2022 Model + TTrades Fractal Model — Daily-Timeframe Backtest Engine
=========================================================================
See CLAUDE.md for full context. This is the reference/starting-point
implementation — port to intraday bars for the live tool.
"""

import csv
import os
from dataclasses import dataclass

OUTDIR = os.path.dirname(os.path.abspath(__file__))


@dataclass
class Bar:
    date: str
    o: float
    h: float
    l: float
    c: float


@dataclass
class Swing:
    idx: int
    kind: str        # 'high' or 'low'
    price: float
    swept: bool = False


@dataclass
class Trade:
    instrument: str
    direction: str          # 'long' or 'short'
    bias_aligned: bool
    sweep_date: str
    sweep_price: float
    mss_date: str
    mss_price: float
    entry_date: str
    entry_price: float
    stop: float
    target_2r: float
    target_3r: float
    exit_date_2r: str = ""
    exit_price_2r: float = None
    result_r_2r: float = None
    exit_date_3r: str = ""
    exit_price_3r: float = None
    result_r_3r: float = None


def load_csv(path):
    bars = []
    with open(path) as f:
        for row in csv.DictReader(f):
            bars.append(Bar(row["date"], float(row["open"]), float(row["high"]),
                             float(row["low"]), float(row["close"])))
    return bars


def find_fractal_swings(bars, left=1, right=1):
    swings = []
    for i in range(left, len(bars) - right):
        window_h = [bars[k].h for k in range(i - left, i + right + 1)]
        window_l = [bars[k].l for k in range(i - left, i + right + 1)]
        if bars[i].h == max(window_h) and window_h.count(bars[i].h) == 1:
            swings.append(Swing(i, "high", bars[i].h))
        if bars[i].l == min(window_l) and window_l.count(bars[i].l) == 1:
            swings.append(Swing(i, "low", bars[i].l))
    return swings


def trend_state_at(swings, confirmed_by_idx):
    highs = [s for s in swings if s.kind == "high" and s.idx + 1 <= confirmed_by_idx]
    lows = [s for s in swings if s.kind == "low" and s.idx + 1 <= confirmed_by_idx]
    if len(highs) < 2 or len(lows) < 2:
        return "neutral"
    hh = highs[-1].price > highs[-2].price
    hl = lows[-1].price > lows[-2].price
    lh = highs[-1].price < highs[-2].price
    ll = lows[-1].price < lows[-2].price
    if hh and hl:
        return "bullish"
    if lh and ll:
        return "bearish"
    return "neutral"


LOOKAHEAD_MSS = 15
LOOKAHEAD_ENTRY = 15
MAX_HOLD = 25
DISPLACEMENT_MULT = 1.15
STOP_BUFFER_FRAC = 0.10


def avg_body(bars, upto_idx, n=10):
    lo = max(0, upto_idx - n)
    bodies = [abs(bars[k].c - bars[k].o) for k in range(lo, upto_idx)]
    return sum(bodies) / len(bodies) if bodies else 0.0001


def run_backtest(bars, instrument):
    swings = find_fractal_swings(bars)
    highs_sorted = [s for s in swings if s.kind == "high"]
    lows_sorted = [s for s in swings if s.kind == "low"]
    trades = []
    n = len(bars)
    for i in range(3, n):
        confirmed_lows = [s for s in lows_sorted if s.idx + 1 <= i and not s.swept]
        confirmed_highs = [s for s in highs_sorted if s.idx + 1 <= i and not s.swept]

        if confirmed_lows:
            ref_low = confirmed_lows[-1]
            if bars[i].l < ref_low.price and bars[i].c > ref_low.price:
                ref_low.swept = True
                trend = trend_state_at(swings, i)
                prior_highs = [s for s in highs_sorted if s.idx <= i]
                if prior_highs:
                    ref_high = prior_highs[-1]
                    t = try_bullish_setup(bars, i, ref_low, ref_high, instrument, trend)
                    if t:
                        trades.append(t)

        if confirmed_highs:
            ref_high2 = confirmed_highs[-1]
            if bars[i].h > ref_high2.price and bars[i].c < ref_high2.price:
                ref_high2.swept = True
                trend = trend_state_at(swings, i)
                prior_lows = [s for s in lows_sorted if s.idx <= i]
                if prior_lows:
                    ref_low2 = prior_lows[-1]
                    t = try_bearish_setup(bars, i, ref_high2, ref_low2, instrument, trend)
                    if t:
                        trades.append(t)
    return trades


def try_bullish_setup(bars, sweep_i, ref_low, ref_high, instrument, trend):
    n = len(bars)
    sweep_extreme = bars[sweep_i].l
    mss_j = None
    for j in range(sweep_i + 1, min(n, sweep_i + 1 + LOOKAHEAD_MSS)):
        if bars[j].c > ref_high.price:
            body = abs(bars[j].c - bars[j].o)
            if body >= DISPLACEMENT_MULT * avg_body(bars, j):
                mss_j = j
                break
    if mss_j is None:
        return None

    mss_price = bars[mss_j].c
    swing_range = mss_price - sweep_extreme
    if swing_range <= 0:
        return None
    entry_high = mss_price - 0.62 * swing_range
    entry_low = mss_price - 0.79 * swing_range

    entry_k, entry_price = None, None
    for k in range(mss_j + 1, min(n, mss_j + 1 + LOOKAHEAD_ENTRY)):
        if bars[k].l < sweep_extreme:
            return None
        if bars[k].l <= entry_high and bars[k].h >= entry_low:
            entry_k, entry_price = k, entry_high
            break
    if entry_k is None:
        return None

    stop = sweep_extreme - STOP_BUFFER_FRAC * swing_range
    risk = entry_price - stop
    if risk <= 0:
        return None
    target_2r = entry_price + 2 * risk
    target_3r = entry_price + 3 * risk
    bias_aligned = trend in ("bullish", "neutral")

    trade = Trade(instrument, "long", bias_aligned,
                   bars[sweep_i].date, sweep_extreme,
                   bars[mss_j].date, mss_price,
                   bars[entry_k].date, entry_price,
                   stop, target_2r, target_3r)
    simulate_exit(bars, entry_k, trade, "long")
    return trade


def try_bearish_setup(bars, sweep_i, ref_high, ref_low, instrument, trend):
    n = len(bars)
    sweep_extreme = bars[sweep_i].h
    mss_j = None
    for j in range(sweep_i + 1, min(n, sweep_i + 1 + LOOKAHEAD_MSS)):
        if bars[j].c < ref_low.price:
            body = abs(bars[j].c - bars[j].o)
            if body >= DISPLACEMENT_MULT * avg_body(bars, j):
                mss_j = j
                break
    if mss_j is None:
        return None

    mss_price = bars[mss_j].c
    swing_range = sweep_extreme - mss_price
    if swing_range <= 0:
        return None
    entry_low = mss_price + 0.62 * swing_range
    entry_high = mss_price + 0.79 * swing_range

    entry_k, entry_price = None, None
    for k in range(mss_j + 1, min(n, mss_j + 1 + LOOKAHEAD_ENTRY)):
        if bars[k].h > sweep_extreme:
            return None
        if bars[k].h >= entry_low and bars[k].l <= entry_high:
            entry_k, entry_price = k, entry_low
            break
    if entry_k is None:
        return None

    stop = sweep_extreme + STOP_BUFFER_FRAC * swing_range
    risk = stop - entry_price
    if risk <= 0:
        return None
    target_2r = entry_price - 2 * risk
    target_3r = entry_price - 3 * risk
    bias_aligned = trend in ("bearish", "neutral")

    trade = Trade(instrument, "short", bias_aligned,
                   bars[sweep_i].date, sweep_extreme,
                   bars[mss_j].date, mss_price,
                   bars[entry_k].date, entry_price,
                   stop, target_2r, target_3r)
    simulate_exit(bars, entry_k, trade, "short")
    return trade


def simulate_exit(bars, entry_k, trade, direction):
    n = len(bars)
    for target_attr, exit_date_attr, exit_price_attr, result_attr, target_val in (
        ("target_2r", "exit_date_2r", "exit_price_2r", "result_r_2r", trade.target_2r),
        ("target_3r", "exit_date_3r", "exit_price_3r", "result_r_3r", trade.target_3r),
    ):
        risk = abs(trade.entry_price - trade.stop)
        outcome_r = None
        exit_date, exit_price = "", None
        for k in range(entry_k, min(n, entry_k + MAX_HOLD)):
            if direction == "long":
                hit_stop = bars[k].l <= trade.stop
                hit_target = bars[k].h >= target_val
            else:
                hit_stop = bars[k].h >= trade.stop
                hit_target = bars[k].l <= target_val
            if hit_stop:
                outcome_r = -1.0
                exit_date, exit_price = bars[k].date, trade.stop
                break
            if hit_target:
                outcome_r = (target_val - trade.entry_price) / risk if direction == "long" \
                    else (trade.entry_price - target_val) / risk
                exit_date, exit_price = bars[k].date, target_val
                break
        if outcome_r is None:
            last = bars[min(n - 1, entry_k + MAX_HOLD - 1)]
            outcome_r = (last.c - trade.entry_price) / risk if direction == "long" \
                else (trade.entry_price - last.c) / risk
            exit_date, exit_price = last.date, last.c
        setattr(trade, exit_date_attr, exit_date)
        setattr(trade, exit_price_attr, exit_price)
        setattr(trade, result_attr, round(outcome_r, 2))


def summarize(trades, label):
    if not trades:
        return f"{label}: 0 trades\n"
    n = len(trades)
    wins = [t for t in trades if t.result_r_2r > 0]
    losses = [t for t in trades if t.result_r_2r <= 0]
    win_rate = 100 * len(wins) / n
    avg_r = sum(t.result_r_2r for t in trades) / n
    total_r = sum(t.result_r_2r for t in trades)
    gains = sum(t.result_r_2r for t in wins)
    pain = abs(sum(t.result_r_2r for t in losses)) or 0.0001
    profit_factor = gains / pain
    running, peak, max_dd = 0.0, 0.0, 0.0
    for t in trades:
        running += t.result_r_2r
        peak = max(peak, running)
        max_dd = min(max_dd, running - peak)
    avg_r3 = sum(t.result_r_3r for t in trades) / n
    total_r3 = sum(t.result_r_3r for t in trades)
    return (
        f"{label}\n"
        f"  trades={n}  wins={len(wins)}  losses={len(losses)}  win_rate={win_rate:.1f}%\n"
        f"  [2R target] avg_R={avg_r:.2f}  total_R={total_r:.2f}  profit_factor={profit_factor:.2f}"
        f"  max_drawdown_R={max_dd:.2f}\n"
        f"  [3R target] avg_R={avg_r3:.2f}  total_R={total_r3:.2f}\n"
    )


def write_trade_log(trades, path):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["instrument", "direction", "bias_aligned", "sweep_date", "sweep_price",
                    "mss_date", "mss_price", "entry_date", "entry_price", "stop",
                    "target_2r", "target_3r", "exit_date_2r", "exit_price_2r", "result_r_2r",
                    "exit_date_3r", "exit_price_3r", "result_r_3r"])
        for t in trades:
            w.writerow([t.instrument, t.direction, t.bias_aligned, t.sweep_date,
                        round(t.sweep_price, 5), t.mss_date, round(t.mss_price, 5),
                        t.entry_date, round(t.entry_price, 5), round(t.stop, 5),
                        round(t.target_2r, 5), round(t.target_3r, 5),
                        t.exit_date_2r, round(t.exit_price_2r, 5) if t.exit_price_2r else "",
                        t.result_r_2r, t.exit_date_3r,
                        round(t.exit_price_3r, 5) if t.exit_price_3r else "", t.result_r_3r])


def main():
    all_trades = []
    report_lines = []
    for instrument, fname in (("EURUSD", "data/eurusd_daily.csv"), ("GBPUSD", "data/gbpusd_daily.csv")):
        bars = load_csv(os.path.join(OUTDIR, fname))
        trades = run_backtest(bars, instrument)
        all_trades.extend(trades)
        report_lines.append(summarize(trades, f"{instrument} - all setups"))
        aligned = [t for t in trades if t.bias_aligned]
        report_lines.append(summarize(aligned, f"{instrument} - bias-aligned only"))
    report_lines.append(summarize(all_trades, "COMBINED - all setups"))
    aligned_all = [t for t in all_trades if t.bias_aligned]
    report_lines.append(summarize(aligned_all, "COMBINED - bias-aligned only"))
    report = "\n".join(report_lines)
    print(report)
    with open(os.path.join(OUTDIR, "backtest_summary.txt"), "w") as f:
        f.write(report)
    write_trade_log(all_trades, os.path.join(OUTDIR, "backtest_trades.csv"))


if __name__ == "__main__":
    main()
