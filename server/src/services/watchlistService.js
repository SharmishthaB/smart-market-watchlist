const db = require('../db');
const marketDataService = require('./marketDataService');
const digestService = require('./digestService');

const MAX_WATCHLIST_LIMIT = Number(process.env.WATCHLIST_MAX_ITEMS) || 50;

/**
 * Get user's complete watchlist enriched with live quotes, attention scores, and digest
 */
async function getUserWatchlist(userId, options = {}) {
  const { sortBy = 'attention' } = options;

  const result = await db.query(
    'SELECT id, symbol, position, added_at FROM watchlist_items WHERE user_id = $1 ORDER BY position ASC',
    [userId]
  );

  const items = result.rows;

  // Enrich with live market data + attention scores
  const enriched = [];
  for (const item of items) {
    const quote = await marketDataService.getQuote(item.symbol);
    enriched.push({
      id: item.id,
      symbol: item.symbol,
      position: item.position,
      addedAt: item.added_at,
      name: quote.name,
      sector: quote.sector,
      price: quote.price,
      prevClose: quote.prevClose,
      change: quote.change,
      changePct: quote.changePct,
      volume: quote.volume,
      avgVolume: quote.avgVolume,
      dayHigh: quote.dayHigh,
      dayLow: quote.dayLow,
      week52High: quote.week52High,
      week52Low: quote.week52Low,
      sparkline: quote.sparkline,
      attention_score: quote.attention_score,
      urgency: quote.urgency,
      badgeColor: quote.badgeColor,
      headline: quote.headline,
      signals: quote.signals,
      source: quote.source,
      updatedAt: quote.updatedAt
    });
  }

  // Sort: default to Attention Score (highest first)
  if (sortBy === 'attention') {
    enriched.sort((a, b) => (b.attention_score || 0) - (a.attention_score || 0));
  } else if (sortBy === 'change') {
    enriched.sort((a, b) => Math.abs(b.changePct || 0) - Math.abs(a.changePct || 0));
  } else if (sortBy === 'custom') {
    enriched.sort((a, b) => a.position - b.position);
  }

  // Compute "While You Were Away" digest
  const digest = await digestService.buildDigest(userId, enriched);

  return {
    items: enriched,
    digest,
    totalCount: enriched.length,
    maxLimit: MAX_WATCHLIST_LIMIT
  };
}

/**
 * Add a stock to user's watchlist (enforces 50-stock product cap)
 */
async function addStock(userId, symbol) {
  if (!symbol) {
    const error = new Error('Symbol is required');
    error.status = 400;
    throw error;
  }

  const cleanSymbol = symbol.trim().toUpperCase();

  // 1. Check user watchlist count to enforce product cap
  const countResult = await db.query(
    'SELECT COUNT(*) as count FROM watchlist_items WHERE user_id = $1',
    [userId]
  );
  const currentCount = parseInt(countResult.rows[0].count, 10);

  if (currentCount >= MAX_WATCHLIST_LIMIT) {
    const error = new Error(
      `Watchlist cap of ${MAX_WATCHLIST_LIMIT} reached. A focused watchlist ensures high-signal attention tracking.`
    );
    error.status = 400;
    throw error;
  }

  // 2. Check if already present
  const existing = await db.query(
    'SELECT id FROM watchlist_items WHERE user_id = $1 AND symbol = $2',
    [userId, cleanSymbol]
  );
  if (existing.rows.length > 0) {
    const error = new Error(`${cleanSymbol} is already in your watchlist`);
    error.status = 409;
    throw error;
  }

  // 3. Add to database
  const insertResult = await db.query(
    'INSERT INTO watchlist_items (user_id, symbol, position) VALUES ($1, $2, $3) RETURNING id, symbol, position, added_at',
    [userId, cleanSymbol, currentCount]
  );

  // 4. Fetch quote and return enriched object
  const quote = await marketDataService.getQuote(cleanSymbol);

  return {
    id: insertResult.rows[0].id,
    symbol: cleanSymbol,
    position: insertResult.rows[0].position,
    addedAt: insertResult.rows[0].added_at,
    name: quote.name,
    sector: quote.sector,
    price: quote.price,
    changePct: quote.changePct,
    attention_score: quote.attention_score,
    urgency: quote.urgency,
    badgeColor: quote.badgeColor,
    headline: quote.headline
  };
}

/**
 * Remove stock from watchlist
 */
async function removeStock(userId, symbol) {
  const cleanSymbol = symbol.trim().toUpperCase();
  const result = await db.query(
    'DELETE FROM watchlist_items WHERE user_id = $1 AND symbol = $2',
    [userId, cleanSymbol]
  );

  if (result.rowCount === 0) {
    const error = new Error(`${cleanSymbol} not found in your watchlist`);
    error.status = 404;
    throw error;
  }

  return { success: true, removedSymbol: cleanSymbol };
}

/**
 * Reorder watchlist items
 */
async function reorderWatchlist(userId, symbols = []) {
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i].trim().toUpperCase();
    await db.query(
      'UPDATE watchlist_items SET position = $1 WHERE user_id = $2 AND symbol = $3',
      [i, userId, sym]
    );
  }
  return { success: true };
}

module.exports = {
  getUserWatchlist,
  addStock,
  removeStock,
  reorderWatchlist,
  MAX_WATCHLIST_LIMIT
};
