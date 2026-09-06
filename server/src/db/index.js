const { Pool } = require('pg');
const crypto = require('crypto');

let pool = null;
let useMemoryFallback = false;

// In-memory fallback stores
const memoryStore = {
  users: new Map(),           // id -> user
  usersByEmail: new Map(),    // email -> user
  watchlist: new Map(),       // id -> item
  snapshots: new Map(),       // id -> snapshot
  marketCache: new Map(),     // symbol -> cached data
  priceHistory: []            // list of history records
};

function initDb() {
  const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER || 'groww_user'}:${process.env.DB_PASSWORD || 'groww_password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'smart_watchlist'}`;

  pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    max: 10
  });

  pool.on('error', (err) => {
    console.warn('[Database] Unexpected error on idle client:', err.message);
  });
}

// Check connectivity on startup
async function testConnection() {
  try {
    if (!pool) initDb();
    const res = await pool.query('SELECT NOW()');
    console.log('[Database] Connected to PostgreSQL successfully at', res.rows[0].now);
    useMemoryFallback = false;
    return true;
  } catch (err) {
    console.warn(`[Database] PostgreSQL connection failed (${err.message}). Activating in-memory resilient fallback.`);
    useMemoryFallback = true;
    return false;
  }
}

function getPool() {
  return pool;
}

function isFallbackMode() {
  return useMemoryFallback;
}

// Robust query wrapper that falls back gracefully
async function query(text, params = []) {
  if (!useMemoryFallback && pool) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      // If DB goes down mid-execution, fall back to memory
      console.warn(`[Database Query Error] ${err.message}. Routing to fallback.`);
    }
  }

  return executeMemoryQuery(text, params);
}

// In-memory query simulation for zero-downtime resilience
function executeMemoryQuery(text, params) {
  const sql = text.trim().toLowerCase();

  // 1. Users queries
  if (sql.includes('select') && sql.includes('from users where email =')) {
    const email = params[0]?.toLowerCase();
    const user = memoryStore.usersByEmail.get(email);
    return { rows: user ? [user] : [] };
  }

  if (sql.includes('select') && sql.includes('from users where id =')) {
    const id = params[0];
    const user = memoryStore.users.get(id);
    return { rows: user ? [user] : [] };
  }

  if (sql.includes('insert into users')) {
    const id = crypto.randomUUID();
    const email = params[0]?.toLowerCase();
    const password_hash = params[1];
    const user = {
      id,
      email,
      password_hash,
      created_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    };
    memoryStore.users.set(id, user);
    memoryStore.usersByEmail.set(email, user);
    return { rows: [user] };
  }

  if (sql.includes('update users set last_seen_at')) {
    const id = params[0];
    const user = memoryStore.users.get(id);
    if (user) {
      user.last_seen_at = new Date().toISOString();
    }
    return { rowCount: 1 };
  }

  // 2. Watchlist queries (order matters: specific patterns first!)

  if (sql.includes('select count(*)') && sql.includes('from watchlist_items where user_id =')) {
    const userId = params[0];
    const count = Array.from(memoryStore.watchlist.values())
      .filter(item => item.user_id === userId).length;
    return { rows: [{ count }] };
  }

  if (sql.includes('select distinct symbol from watchlist_items')) {
    const symbols = Array.from(new Set(Array.from(memoryStore.watchlist.values()).map(i => i.symbol)));
    return { rows: symbols.map(s => ({ symbol: s })) };
  }

  if (sql.includes('delete from watchlist_items') && sql.includes('where user_id =') && sql.includes('symbol =')) {
    const [userId, symbol] = params;
    const deleted = memoryStore.watchlist.delete(`${userId}:${symbol.toUpperCase()}`);
    return { rowCount: deleted ? 1 : 0 };
  }

  if (sql.includes('select') && sql.includes('from watchlist_items') && sql.includes('where user_id =') && sql.includes('symbol =')) {
    const [userId, symbol] = params;
    const item = memoryStore.watchlist.get(`${userId}:${symbol.toUpperCase()}`);
    return { rows: item ? [item] : [] };
  }

  if (sql.includes('select') && sql.includes('from watchlist_items') && sql.includes('where user_id =')) {
    const userId = params[0];
    const items = Array.from(memoryStore.watchlist.values())
      .filter(item => item.user_id === userId)
      .sort((a, b) => a.position - b.position);
    return { rows: items };
  }

  if (sql.includes('insert into watchlist_items')) {
    const id = crypto.randomUUID();
    const [userId, symbol, position] = params;
    const item = {
      id,
      user_id: userId,
      symbol: symbol.toUpperCase(),
      added_at: new Date().toISOString(),
      position: position || 0
    };
    memoryStore.watchlist.set(`${userId}:${symbol.toUpperCase()}`, item);
    return { rows: [item] };
  }

  if (sql.includes('update watchlist_items set position')) {
    const [position, userId, symbol] = params;
    const item = memoryStore.watchlist.get(`${userId}:${symbol.toUpperCase()}`);
    if (item) {
      item.position = position;
    }
    return { rowCount: 1 };
  }

  // 3. Snapshots
  if (sql.includes('select') && sql.includes('from snapshots') && sql.includes('order by captured_at desc limit 1')) {
    const userId = params[0];
    const userSnapshots = Array.from(memoryStore.snapshots.values())
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.captured_at) - new Date(a.captured_at));
    return { rows: userSnapshots.slice(0, 1) };
  }

  if (sql.includes('insert into snapshots')) {
    const id = crypto.randomUUID();
    const userId = params[0];
    const data = params[1];
    const capturedAt = params[2] || new Date().toISOString();
    const snapshot = {
      id,
      user_id: userId,
      captured_at: capturedAt,
      data: typeof data === 'string' ? JSON.parse(data) : data
    };
    memoryStore.snapshots.set(id, snapshot);
    return { rows: [snapshot] };
  }

  // 4. Market cache
  if (sql.includes('select') && sql.includes('from market_data_cache where symbol =')) {
    const symbol = params[0]?.toUpperCase();
    const data = memoryStore.marketCache.get(symbol);
    return { rows: data ? [data] : [] };
  }

  if (sql.includes('select * from market_data_cache')) {
    return { rows: Array.from(memoryStore.marketCache.values()) };
  }

  if (sql.includes('insert into market_data_cache') || sql.includes('on conflict (symbol) do update')) {
    const record = {
      symbol: params[0]?.toUpperCase(),
      name: params[1],
      price: params[2],
      prev_close: params[3],
      change: params[4],
      change_pct: params[5],
      volume: params[6],
      avg_volume: params[7],
      day_high: params[8],
      day_low: params[9],
      week_52_high: params[10],
      week_52_low: params[11],
      market_cap: params[12],
      sector: params[13],
      attention_score: params[14],
      attention_signals: typeof params[15] === 'string' ? JSON.parse(params[15]) : params[15],
      sparkline: typeof params[16] === 'string' ? JSON.parse(params[16]) : params[16],
      updated_at: new Date().toISOString(),
      source: params[17] || 'live'
    };
    memoryStore.marketCache.set(record.symbol, record);
    return { rows: [record] };
  }

  return { rows: [] };
}

module.exports = {
  initDb,
  testConnection,
  getPool,
  isFallbackMode,
  query,
  memoryStore
};
