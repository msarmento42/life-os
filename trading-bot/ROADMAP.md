# Trading Bot — Roadmap

*This file is maintained by the weekly strategy research task (Sunday 11 AM) and the monthly calibration task (1st of month). Build sessions read from "Queued Improvements" and pick the next `[ ]` item.*

---

## Active Strategies (13 total — 3 added 2026-05-28)

| Strategy | Signal Type | Regime | Status |
|----------|-------------|--------|--------|
| atr | Volatility-based sizing | All | ✅ Active — **#1 ranked, Sharpe ~3.15–3.82 (6 consecutive nights)** |
| macd | Trend-following | Trending | ✅ Active — **#2 ranked, Sharpe ~2.34** |
| rsi | Mean-reversion | Mean-reverting | ✅ Active — **#3 ranked, Sharpe ~1.97** |
| bollinger | Mean-reversion | Volatile | ✅ Active — unranked (insufficient signal data) |
| vwap | Intraday momentum | All | ✅ Active — unranked |
| meanrev | Mean-reversion | Mean-reverting | ✅ Active — unranked |
| pairs | Statistical arbitrage | All | ✅ Active — unranked |
| momentum_breakout | Trend-following | Trending | ✅ Active (new 2026-05-28) — insufficient history |
| ema_ribbon | Trend-following | Trending | ✅ Active (new 2026-05-28) — insufficient history |
| volume_momentum | Momentum | All | ✅ Active (new 2026-05-28) — insufficient history |
| sma | Trend-following | Trending | ⚠️ **KILL CANDIDATE (vote 1/2)** — zero stock signals 6+ consecutive nights |
| dual_momentum | Trend-following | Trending | ⚠️ **KILL CANDIDATE (vote 1/2)** — zero stock signals 6+ consecutive nights |
| regime | Meta/regime detection | All | ⚠️ **KILL CANDIDATE (vote 1/2)** — zero stock signals 6+ consecutive nights |

---

## Architecture Notes

- Bot lives at: `~/Desktop/Claude/trading-bot`
- API runs at: `http://localhost:8000`
- Traded universe: 11 stocks (AAPL, MSFT, TSLA, SPY, QQQ, NVDA, GOOGL, META, AMZN, JPM, GLD) + 5 crypto
- Strategy files: `backend/strategies/`
- Market posture: `data/market_posture.json` (written by premarket scan, updated by midday check)
- Attribution history: `data/attribution_history.json` (written by postmarket recap)
- Position sizing: `data/position_sizing.json` (written by nightly backtest)

---

## Queued Improvements

*Format: `- [ ] [DATE added] [Description — specific enough for a build agent to implement]*`

- [ ] [2026-06-01] **PRIORITY 1** — Implement minimum hold period — add 12-cycle (1-hour) lockout after any entry before a sell signal is honored. This is the root cause of all realized losses (-$14.02): all 3 May 14 positions reversed within 2 minutes. Modify execution loop: record `entry_time` on fill confirmation; suppress sell signals until `current_time - entry_time >= 12 cycles`.
- [ ] [2026-06-01] **PRIORITY 2** — Wire ATR position sizing into execution loop — at order time, read `data/position_sizing.json`; use `recommended_max_pct` per symbol instead of flat 20%. TSLA recommended 6.55% vs current 20% (3× oversized), NVDA 7.02% vs 20%. Already generated nightly — just needs to be read and applied.
- [ ] [2026-05-20] Add volume filter to RSI strategy — only trigger RSI buy/sell signals when 20-day average volume is above the 50-day average volume. Modify `backend/strategies/rsi.py`, add `volume_filter` parameter (default: True). Hypothesis: RSI signals in low-volume environments are false reversals.
- [ ] [2026-05-20] Add ADX regime filter to SMA and MACD strategies — skip trade signals when ADX(14) < 20 (non-trending market). Modify `backend/strategies/sma.py` and `backend/strategies/macd.py`. Add `adx_threshold` parameter (default: 20). Hypothesis: trend-following strategies underperform in choppy/sideways markets.
- [ ] [2026-05-20] Implement ATR-based dynamic position sizing — replace the flat 20% allocation per symbol with ATR-scaled sizing. Target: (portfolio_size * 0.01) / ATR(14). Cap at 20%. Update position sizing logic in the portfolio manager. Write results to `data/position_sizing.json` via nightly backtest task.
- [ ] [2026-05-20] Add correlation circuit breaker — when pairs correlation exceeds 0.85 on a rolling 20-day window, reduce combined position size by 50% for that cluster. Prevents fake diversification losses. Implement in portfolio manager, flag in weekly review output.
- [ ] [2026-05-24] Add crypto volatility halt — at premarket scan, fetch BTC 24h % change; if abs(change) > 5%, write `crypto_halted: true` to `data/market_posture.json`. All strategies (or the portfolio manager) check this flag and return no-position for crypto instruments that session. Reset at next premarket scan. Threshold 5% (tunable). Estimated effort: 30 min.
- [ ] [2026-05-24] Add Bollinger Band confirmation candle filter — in `backend/strategies/bollinger.py`, track whether the prior bar was a BUY_CANDIDATE (close < lower band). Only confirm the entry signal if the current bar closes back above the lower band (rejection confirmation). Prevents chasing price as it walks the band in trending regimes. Add `require_confirmation: bool = True` parameter. Estimated effort: 1 hour.

---

## Kill Candidates

*Strategies flagged for review — require 2 consecutive weekly review KILL votes to remove.*

- **SMA Crossover** — Vote 1/2 (2026-06-01 monthly calibration). Zero stock signals in 6+ consecutive nightly backtests, including confirmed trending markets (GOOGL ADX=59). If still zero signals at next weekly review, remove.
- **Dual Momentum** — Vote 1/2 (2026-06-01 monthly calibration). Zero signals despite lookback reduction from 252→60 bars. If still zero at next weekly review, remove.
- **Regime Detection** — Vote 1/2 (2026-06-01 monthly calibration). Zero stock signals 6+ consecutive nights. Note: regime detection functionality has been superseded by the intelligence layer (market_intelligence.py). May be redundant.

---

## Watch List

*Strategies showing weakness — monitor before kill decision.*

- **RSI** — Keep (ranked #3), but add volume filter before next calibration. May be generating false signals in low-volume conditions (root of May 14 whipsaws).
- **Momentum Breakout, EMA Ribbon, Volume Momentum** — New as of 2026-05-28. Insufficient history to rank. Watch through July.

---

## Completed Improvements

- [x] [2026-05-28] Fixed Kalshi API URL (trading-api.kalshi.com → api.elections.kalshi.com). Markets now scanning 20 per cycle with public auth.
- [x] [2026-05-28] Deployed launchd plist for bot auto-restart on crash/reboot (~/Library/LaunchAgents/com.tradingbot.plist).
- [x] [2026-05-28] Fixed Alpaca order sync gap — startup sync loop added to AlpacaBroker; 7 stuck orders cleared.
- [x] [2026-05-28] Intelligence layer live — MarketRegime + MarketIntelligence detects regime per symbol (ADX, ATR%, 50-EMA); routes strategies by regime; scales confidence → position size (50–100% of ATR cap).
- [x] [2026-05-28] Added 3 new strategies: Momentum Breakout, EMA Ribbon, Volume Momentum.
- [x] [2026-05-28] ATR stop losses wired — sells if current_price < avg_entry - 2.5×ATR.
- [x] [2026-05-28] Portfolio drawdown circuit breaker — pauses trading if down >7% from starting capital.
- [x] [2026-05-XX] Dual Momentum lookback reduced 252→60 bars.

---

## Month 1 Summary (May 2026)

**Key wins:**
- Bot went from crashed/offline to fully automated via launchd (auto-restart on crash + reboot)
- Intelligence layer shipped: regime detection + strategy routing + confidence-scaled sizing
- 13 strategies active (up from 10)
- Kalshi + Alpaca sync both fixed

**Key problems:**
- Only 7 completed trades total (bot was offline for ~27 of 31 market days)
- All -$14.02 realized loss came from 3 positions that reversed within 2 minutes on May 14 — no minimum hold period
- ATR position sizing file exists but is not read by the execution loop (all orders still flat 20%)
- Go-live clock has not started

**Most important thing to build in June:** Minimum hold period (12 cycles) + wire ATR position sizing. Both are execution loop changes, can ship in one session. Expected to eliminate whipsaw losses and bring TSLA/NVDA sizing in line with risk tolerance.

---

## Research Backlog (future ideas — not yet queued)

- Volatility regime switch: use rolling realized vol vs. VIX to auto-select mean-reversion vs. trend-following strategies
- ML ensemble layer: use XGBoost to combine top 3 strategy signals with regime context
- ~~Crypto-specific volatility filter~~ → promoted to Queued Improvements (2026-05-24)
- Intraday momentum fade: fade the first 30-min move on high-gap opens (>1.5% SPY gap)
- Pairs cointegration refresh: re-test pairs cointegration monthly, swap weak pairs
