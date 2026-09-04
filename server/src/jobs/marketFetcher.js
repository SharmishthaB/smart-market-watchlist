const cron = require('node-cron');
const db = require('../db');
const marketDataService = require('../services/marketDataService');

let task = null;

async function runFetchCycle() {
  try {
    // 1. Find all symbols being actively watched across all users
    const result = await db.query('SELECT DISTINCT symbol FROM watchlist_items');
    const watchedSymbols = result.rows.map(r => r.symbol);

    // Also include a few core benchmark assets (AAPL, NVDA, TSLA, SPY) so system is warm
    const coreSymbols = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'SPY'];
    const allSymbols = Array.from(new Set([...coreSymbols, ...watchedSymbols]));

    if (allSymbols.length === 0) return;

    // 2. Batch update market data in cache
    const quotes = await marketDataService.refreshSymbols(allSymbols);

    // 3. Persist to market_data_cache table in PostgreSQL
    for (const symbol of Object.keys(quotes)) {
      const q = quotes[symbol];
      if (!q) continue;

      const sql = `
        INSERT INTO market_data_cache (
          symbol, name, price, prev_close, change, change_pct,
          volume, avg_volume, day_high, day_low, week_52_high, week_52_low,
          sector, attention_score, attention_signals, sparkline, source, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        ON CONFLICT (symbol) DO UPDATE SET
          price = EXCLUDED.price,
          prev_close = EXCLUDED.prev_close,
          change = EXCLUDED.change,
          change_pct = EXCLUDED.change_pct,
          volume = EXCLUDED.volume,
          day_high = EXCLUDED.day_high,
          day_low = EXCLUDED.day_low,
          attention_score = EXCLUDED.attention_score,
          attention_signals = EXCLUDED.attention_signals,
          sparkline = EXCLUDED.sparkline,
          source = EXCLUDED.source,
          updated_at = NOW();
      `;

      try {
        await db.query(sql, [
          q.symbol,
          q.name,
          q.price,
          q.prevClose,
          q.change,
          q.changePct,
          q.volume,
          q.avgVolume,
          q.dayHigh,
          q.dayLow,
          q.week52High,
          q.week52Low,
          q.sector,
          q.attention_score,
          JSON.stringify(q.signals || {}),
          JSON.stringify(q.sparkline || []),
          q.source
        ]);
      } catch (dbErr) {
        // Continue loop even if single record fails
      }
    }
  } catch (err) {
    console.warn('[Market Fetcher Cycle Error]:', err.message);
  }
}

function startMarketFetcher() {
  // Initial run immediately on server boot
  runFetchCycle();

  // Run every 20 seconds
  task = cron.schedule('*/20 * * * * *', () => {
    runFetchCycle();
  });

  console.log('[Market Fetcher] Background scheduler active (20s interval).');
}

function stopMarketFetcher() {
  if (task) {
    task.stop();
    task = null;
    console.log('[Market Fetcher] Background scheduler stopped.');
  }
}

module.exports = {
  startMarketFetcher,
  stopMarketFetcher,
  runFetchCycle
};
