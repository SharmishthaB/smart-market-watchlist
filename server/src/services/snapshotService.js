const db = require('../db');

/**
 * Snapshot Service
 * Captures and retrieves frozen points-in-time of a user's watchlist state.
 */

async function captureSnapshot(userId, watchlistItems = [], customTimestamp = null) {
  if (!userId) throw new Error('User ID is required for snapshot');

  const snapshotData = {};
  for (const item of watchlistItems) {
    snapshotData[item.symbol] = {
      symbol: item.symbol,
      name: item.name || item.symbol,
      price: Number(item.price) || 0,
      prev_close: Number(item.prev_close) || 0,
      change_pct: Number(item.change_pct) || 0,
      volume: Number(item.volume) || 0,
      avg_volume: Number(item.avg_volume) || 0,
      attention_score: Number(item.attention_score) || 0,
      urgency: item.urgency || 'minor',
      captured_at: customTimestamp || new Date().toISOString()
    };
  }

  const result = await db.query(
    'INSERT INTO snapshots (user_id, data) VALUES ($1, $2) RETURNING id, user_id, captured_at, data',
    [userId, JSON.stringify(snapshotData), customTimestamp || new Date().toISOString()]
  );

  // Prune older snapshots asynchronously to keep DB clean
  pruneSnapshots(userId, 5).catch(err => {
    console.warn('[Snapshot Service] Failed to prune old snapshots:', err.message);
  });

  return result.rows[0];
}

async function getLatestSnapshot(userId) {
  const result = await db.query(
    'SELECT id, user_id, captured_at, data FROM snapshots WHERE user_id = $1 ORDER BY captured_at DESC LIMIT 1',
    [userId]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    capturedAt: row.captured_at,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  };
}

async function pruneSnapshots(userId, keepCount = 5) {
  // In memory fallback handles pruning implicitly if needed; in PG:
  const sql = `
    DELETE FROM snapshots 
    WHERE user_id = $1 AND id NOT IN (
      SELECT id FROM snapshots WHERE user_id = $1 ORDER BY captured_at DESC LIMIT $2
    )
  `;
  try {
    await db.query(sql, [userId, keepCount]);
  } catch (err) {
    // Non-critical cleanup
  }
}

module.exports = {
  captureSnapshot,
  getLatestSnapshot,
  pruneSnapshots
};
