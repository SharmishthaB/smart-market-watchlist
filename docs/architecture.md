# Architecture Decision Records (ADR) — Groww Pulse

## 1. Context & Problem Statement
Groww Code 2026 poses the challenge:
> *"Build a smart market watchlist that helps users not just track stocks, but quickly understand what has 'meaningfully changed' since they last checked, and what deserves their attention now."*

Stock market apps routinely suffer from informational clutter. Presenting a flat list of 20 stocks sorted alphabetically or by raw percentage return pushes the cognitive burden of anomaly detection entirely onto the user. Our goal is to architect a system that evaluates market telemetry on the server and surfaces high-conviction signals.

---

## 2. Decision Log

### ADR-01: Attention Score as a Multi-Factor Dynamic Metric
- **Status:** Accepted
- **Decision:** Rather than relying on arbitrary user-defined threshold alerts ("alert me if AAPL drops 2%"), we built an algorithmic **Attention Engine** evaluating four econometric dimensions:
  1. **Relative Volatility ($Z$-Score):** Normalized against each stock's 30-day standard deviation.
  2. **Volume Anomaly:** Today's volume vs 30-day average.
  3. **Milestone Level Breaks:** 52-week highs/lows, moving averages (20d, 50d).
  4. **Sector Divergence:** Idiosyncratic variance vs industry benchmark.
- **Consequence:** The watchlist naturally self-orders by importance. The most urgent asset surfaces to the top of the table without user configuration.

### ADR-02: Snapshot Diffing for "While You Were Away" Experience
- **Status:** Accepted
- **Decision:** We store point-in-time state snapshots in PostgreSQL using `JSONB`. A snapshot is recorded on session departure or digest acknowledgment.
- **Trade-off:**
  - *Changelog table vs JSONB snapshot:* A continuous changelog table creates high row churn (millions of tick rows). A JSONB snapshot captures the frozen state with minimal storage footprint ($O(N)$ where $N \le 50$) and allows instant $O(N)$ object diffing in Node.js memory.

### ADR-03: Shared Server-Side Caching with Batched Fetching
- **Status:** Accepted
- **Decision:** Frontend clients never call third-party market APIs directly. The server aggregates all watched symbols across all registered users into a unified set. A background worker refreshes this deduplicated set in batches.
- **Consequence:** 
  - 10,000 users tracking Apple (AAPL) causes **1 single API request** from our backend, instead of 10,000 requests.
  - Zero exposure of third-party API keys to the browser.
  - Complete protection against free-tier rate limit exhaustion (HTTP 429).

### ADR-04: Battery-Aware Smart Polling over WebSockets
- **Status:** Accepted
- **Decision:** While WebSockets provide bi-directional push, external free market APIs do not provide continuous sub-second tick streams. Implementing WebSockets on the frontend while polling on the backend introduces WebSocket connection state management without reducing upstream latency.
- **Alternative Chosen:** Smart REST polling with HTML5 Page Visibility API:
  - 15s interval while tab is active.
  - 60s interval while tab is in background.
  - Explicit UI Freshness counter informing users of exact telemetry age.

### ADR-05: Product Cap of 50 Stocks per Watchlist
- **Status:** Accepted
- **Decision:** Enforce a strict 50-item limit per user watchlist.
- **Rationale:** Watchlists with 300+ items are portfolios or index trackers, not watchlists. A 50-stock boundary encourages intentional curation, prevents visual exhaustion, and keeps client DOM rendering fast without virtualization overhead.
