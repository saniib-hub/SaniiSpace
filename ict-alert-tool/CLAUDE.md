# Project: ICT 2022 Model + TTrades — Live Entry Alert Tool

## Context (read this first)

This project was started in a sandboxed environment (Cowork) that could not
reach live broker/data APIs (OANDA, Yahoo Finance, Twelve Data, Finnhub were
all network-blocked; only Alpha Vantage's free, daily-only, 25-req/day tier
was reachable) and had no email-sending capability. That's why the work so
far is a **daily-bar backtest**, not a live tool.

Whoever picks this up next with real network access should take the
validated detection logic below and turn it into what the user actually
wants — a tool that watches live forex/gold prices and **notifies the user
30–60 minutes before a high-probability ICT 2022-Model entry sets up**, with
precise live levels, not vague signals.

`ict_ttrades_backtest.py` and `data/{eurusd,gbpusd}_daily.csv` are the
working reference implementation and a real backtest result (75% win rate
on 8 trades, 100 days, EUR/USD + GBP/USD — small sample, directionally
promising, not proof). Run it with `python3 ict_ttrades_backtest.py` from
this directory; it regenerates `backtest_summary.txt` and
`backtest_trades.csv`. `verify_backtest.py` independently re-derives every
trade from raw OHLC (0 discrepancies as of this writing) — see
`verification_report.md`.

There is now also a browser dashboard (`api/` FastAPI backend +
`web/` React/shadcn frontend, see the top-level README.md for how to run
both) that visualizes the backtest, the verification report, and has a
Live Monitor tab wired for OANDA daily candles — but the OANDA client in
`api/oanda_client.py` has only been tested against mocked HTTP responses,
never a real account, and the live monitor only re-runs the **daily**-bar
engine, not the intraday port described in step 3 below. The intraday port
itself has NOT been done yet.

## What "done" looks like

A running process that, for each tracked instrument, during the London
(03:00 NY) and New York (08:00 NY) kill zones:

1. Pulls live/recent price data.
2. Computes daily bias (higher-timeframe swing structure — TTrades'
   fractal/daily-closure method).
3. Detects the ICT sequence in real time: **liquidity sweep → market
   structure shift (MSS) → displacement → PD-array retracement (FVG /
   order block / OTE)**.
4. The moment a sweep + MSS + displacement confirms (this is the "30–60 min
   before entry" moment — the setup is armed but price hasn't yet retraced
   into the entry zone), sends a notification with: instrument, direction,
   sweep level, MSS confirmation level, the exact PD-array/OTE entry zone
   to watch, invalidation level (stop), and target(s).
5. Optionally, a second notification when price actually taps the entry
   zone (the live trigger moment).

## Step-by-step build plan

### 1. Data source — get real intraday data

Do NOT reuse Alpha Vantage's free tier for this — its intraday forex
endpoint (`FX_INTRADAY`) is paid-only, confirmed during testing. Options,
best first:

- **OANDA v20 REST API, practice account** (recommended). Free, no card,
  real streaming-quality candles, generous rate limits, supports forex +
  gold (XAU/USD). Sign up at oanda.com, create a practice account, get an
  API key + account ID. Base URL: `https://api-fxpractice.oanda.com`.
  Endpoint for candles: `/v3/instruments/{instrument}/candles`.
- Alternative: `yfinance` (free, no key, unofficial Yahoo Finance wrapper)
  if OANDA setup is more than the user wants to do — lower data quality
  (15-20 min delayed, gaps), fine for prototyping, not for precise
  kill-zone timing.
- Alternative: any broker the user already has an account with that
  exposes a REST/WebSocket API (Interactive Brokers, Alpaca, etc.)

Test whichever you pick with a simple script BEFORE building anything else
— confirm you can pull 1m/5m/15m/1H candles for the target instruments.

### 2. Instruments

EUR/USD, GBP/USD, XAU/USD (gold) — per the user's original spec. Confirm
gold is available on whichever data source you choose (OANDA supports it;
Alpha Vantage's free forex daily endpoint does not).

### 3. Port the detection logic to intraday

The daily-bar engine (`ict_ttrades_backtest.py`) already implements and
*verified* the core sequence:

- fractal swing detection
- sweep detection (wick beyond a confirmed swing, close back inside)
- MSS detection (close beyond the opposite-side reference swing, within a
  lookahead window)
- displacement filter (candle body >= 1.15x recent average body)
- OTE entry zone (62%–79% retracement of the sweep-to-MSS leg)
- a TTrades-style higher-timeframe bias filter

Port this same logic to run on 5m/15m bars for the entry/MSS layer, with
daily/1H bars for the higher-timeframe bias (this matches how ICT and
TTrades actually teach it — daily bias, intraday execution). The math
doesn't change; only the bar granularity and the addition of session/
kill-zone time filters (London open 03:00 NY, New York open 08:00 NY).

Once ported, **backtest the intraday version first** against at least a
few months of real intraday history before wiring up live notifications —
don't skip this. Reuse the stats/reporting functions from the reference
engine (`summarize`, `write_trade_log`).

### 4. Scheduling

Run as a loop or scheduled job that wakes up during kill-zone windows
(cron, APScheduler, or a simple `while True` + `time.sleep`). Fetch fresh
candles, run the detection logic incrementally (don't reprocess all
history every tick — track state: which swings are already swept, which
setups are already armed/notified, so you don't duplicate-alert).

### 5. Notifications

Pick based on what the user is willing to set up:

- **Email**: needs an SMTP relay or a transactional email API (e.g. Resend,
  SendGrid) with an API key. Simple `smtplib` + an app password on their
  own Gmail/Outlook account is the fastest path if they're OK with that.
- **Desktop notification**: `plyer` (cross-platform) or OS-native (e.g.
  `terminal-notifier` on macOS, `notify-send` on Linux, `win10toast` on
  Windows) — only fires while the script is actually running.
- **Telegram bot**: free, reliable, push-to-phone, ~10 min setup via
  BotFather. Often the best effort/reward tradeoff for this use case —
  worth suggesting to the user if they haven't ruled it out.

Ask the user which they want before building it — don't assume.

### 6. Safety / honesty

- Never claim a specific win probability beyond what's actually been
  backtested on real data.
- Always include the invalidation/stop level in every notification, not
  just the entry.
- This is a decision-support tool, not an auto-trader — it should not
  place trades. If the user later asks for that, flag the added risk
  (execution bugs, no human check) explicitly before building it.

## First things to ask the user (if not already answered)

1. OANDA practice account (or other live data source) — do they have one,
   or do you need to walk them through getting one?
2. Notification channel — email (needs SMTP/app password or an API key),
   Telegram bot, or desktop notification?
3. Confirm instrument list (default: EUR/USD, GBP/USD, XAU/USD).
