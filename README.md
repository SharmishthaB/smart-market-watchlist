# Groww Pulse — Smart Market Watchlist (Groww Code 2026)

> **Submission for Groww Code 2026**  
> *A smart market watchlist that tells users what deserves their attention now — not just what moved.*

---

## Product Pitch

Most watchlists treat markets as a flat spreadsheet of percentage changes, ignoring relative volatility, volume anomalies, and user attention. **Groww Pulse** is an attention-weighted market intelligence watchlist built with React, Node.js, and PostgreSQL. At its core is an **Attention Engine** that calculates dynamic 0–100 scores combining volatility Z-scores, volume surges, technical level breakouts, and sector alpha. When users return, a **"While You Were Away" Digest** generates human-readable diffs highlighting structural changes since their previous session. Featuring server-side batched caching, honest data staleness meters, and a 50-stock product cap, it turns noise into conviction.

---

## System Architecture

```
                                    +-----------------------------------------+
                                    |         GROWW PULSE WEB CLIENT          |
                                    |     (React 18 + Vite + Context API)     |
                                    +--------------------+--------------------+
                                                         |
                                       HTTPS REST + JWT  |  Battery-Aware Smart Polling
                                       (Bearer Auth)     |  (15s active / 60s background)
                                                         v
                                    +-----------------------------------------+
                                    |             EXPRESS SERVER              |
                                    | ┌─────────────────────────────────────┐ |
                                    | │  Auth Service (bcrypt + JWT)        │ |
                                    | │  Watchlist Service (50-Cap Guard)   │ |
                                    | │  Snapshot Service (JSONB Snapshots) │ |
                                    | │  Digest Service (Delta Classifier)  │ |
                                    | │  Attention Score Engine (4 Signals) │ |
                                    | └─────────────────────────────────────┘ |
                                    +---------+---------------------+---------+
                                              |                     |
                        Read/Write State      |                     | Shared Cache
                                              v                     v
                                    +-------------------+ +-------------------+
                                    |    PostgreSQL     | |  In-Memory Cache  |
                                    |  (Persistent DB)  | |  (TTL + Provenance|
                                    +-------------------+ +---------+---------+
                                                                    ^
                                                                    | Background Cron
                                                                    | (15s–30s batches)
                                                          +---------+---------+
                                                          |  Market Fetcher   |
                                                          |  Finnhub / Twelve |
                                                          |  Data / Fallback  |
                                                          +-------------------+
```

---

## Key Engineering Decisions & The Why

### 1. What Counts as a "Meaningful Change"?
A standard 2% move on a low-volatility utility stock is a statistically rare anomaly, whereas the same 2% on a volatile tech stock is routine noise. Simple percentage alerts fail because they lack statistical context.

Our **Attention Score Engine** computes a 0–100 composite score from four weighted econometric signals:

$$\text{Attention Score} = 0.35 \cdot S_{\text{volatility}} + 0.25 \cdot S_{\text{volume}} + 0.25 \cdot S_{\text{breakout}} + 0.15 \cdot S_{\text{sector}}$$

1. **Relative Volatility ($S_{\text{volatility}}$, 35%):** Uses the Z-Score of the current move relative to the asset's own historical 30-day standard deviation ($\sigma$).
   - $Z = \frac{|\Delta\%|}{\sigma}$
   - $Z \ge 2.0\sigma$ represents a 95th-percentile rarity event and awards high points.
2. **Volume Anomaly ($S_{\text{volume}}$, 25%):** Compares today's cumulative volume against the 30-day average. A ratio $\ge 2.0\times$ confirms institutional conviction.
3. **Technical Level Breaks ($S_{\text{breakout}}$, 25%):** Detects crosses of 52-week highs/lows, intraday highs, and 20-day / 50-day moving averages.
4. **Sector Divergence ($S_{\text{sector}}$, 15%):** Measures idiosyncratic alpha by subtracting sector index returns. A stock dropping 2% while its sector rises 2.5% signals company-specific risk.

Stocks are categorized into:
- 🔴 **Urgent (Score $\ge$ 65):** Animated pulse border, prioritized to top of watchlist.
- 🟡 **Notable (Score 35–64):** Amber highlight.
- ⚪ **Minor (Score < 35):** Routine trading range.

---

### 2. "While You Were Away" Session Digest


Instead of forcing users to mentally reconcile dozens of numbers, Groww Pulse captures **JSONB Snapshots** of the user's watchlist upon logout, session timeout, or digest dismissal.

When the user returns:
- The backend loads the latest snapshot and diffs it against live prices.
- It calculates $\Delta \text{Price}$, $\Delta \text{Attention Score}$, and volume multipliers.
- It produces human-readable narratives:
  > *"NVDA: +4.2% since your last visit 3 hours ago — unusual move (3.1x daily std dev). Surged to fresh 52-week high on 2.4x volume."*
- Clicking **"Got It (Set Baseline)"** resets the snapshot point-in-time.

---

### 3. State Persistence Across Sessions & Devices
- **Auth Architecture:** Secure email/password authentication using 10-round `bcrypt` hashing and stateless `JWT` tokens.
- **Cross-Device Sync:** Watchlists, ordering, and historical snapshots are tied to user UUIDs in PostgreSQL. A user logging in from a phone or laptop receives their exact personalized state and digest.

---

### 4. Handling Stale, Delayed, or Conflicting Data
Real financial systems face outages, rate limits, and delayed feeds:
- **Server-Side Batched Caching:** All watched symbols are deduplicated into a global set. One background worker fetches data for all users, caching responses with a 30-second TTL.
- **Honest Freshness Indicator:** The UI displays a live counter (*"Updated 12s ago"*). Color degrades from Green (<45s) to Amber (<120s) to Red (>120s) so users are never misled.
- **Graceful Fallback Mode:** If the external API is unreachable or rate-limited (HTTP 429), the server serves cached quotes with a `stale` flag. If the API key is not configured, a realistic geometric Brownian motion simulation runs automatically so evaluators can test immediately without setup friction.
- **In-Memory Resilient DB Fallback:** If PostgreSQL is temporarily stopped, the server activates an in-memory replica store so the application never crashes.

---

### 5. Scalability: How Large Watchlists and More Users Scale
- **API Budget Math:** 
  $$\text{1,000 users} \times \text{50 stocks} \approx \text{1,500 to 2,500 unique symbols across market}$$
  Without batching, 1,000 users polling every 15s would require $1,000 \times 4 = 4,000 \text{ req/min}$ (exceeding API limits).  
  With our **shared server-side cache**, 2,000 unique symbols fetched in batches of 50 every 30s requires only **40 requests per minute** total.
- **50-Stock Product Cap:** The 50-stock limit is an intentional product design decision. A 500-stock watchlist is noise; 50 stocks force meaningful curation and protect client render performance.
- **Battery-Aware Polling:** Using the HTML5 Page Visibility API, client polling automatically drops from 15s to 60s when the user minimizes or switches tabs.

---

## Quickstart Guide

### Option A: 1-Command Run with Docker Compose (Recommended)

Make sure Docker is running, then in the project root:

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **PostgreSQL:** localhost:5432

*A pre-configured evaluator demo button is provided on the login screen for 1-click evaluation!*

---

### Option B: Local Setup Without Docker

#### 1. Server Setup
```bash
cd server
npm install
npm run migrate   # optional: applies PostgreSQL migrations if PG is running
npm start
```
*Note: If PostgreSQL is not installed locally, the server automatically starts in resilient in-memory mode!*

#### 2. Client Setup
```bash
cd client
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new account with email & password |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `GET` | `/api/watchlist` | Get user watchlist with attention scores & digest |
| `POST` | `/api/watchlist` | Add stock (enforces 50-stock cap) |
| `DELETE` | `/api/watchlist/:symbol` | Remove stock from watchlist |
| `PATCH` | `/api/watchlist/reorder` | Update custom ordering of stocks |
| `GET` | `/api/market/search?q=` | Search stocks with autocomplete |
| `GET` | `/api/market/status` | Market status and data freshness timer |
| `POST` | `/api/digest/dismiss` | Dismiss digest and capture fresh snapshot |
| `POST` | `/api/digest/snapshot` | Manual baseline snapshot checkpoint |

---

## Verification & Automated Tests

Run unit tests for the Attention Score Engine, Snapshot & Digest System, and Auth Service:

```bash
cd server
npm test
```

All test suites validate:
- Statistical volatility Z-score calculations
- Volume anomaly scaling
- 52-week breakout detection
- Snapshot diff generation & digest thresholds
- Auth password hashing & duplicate protection
