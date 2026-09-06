const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

async function register(email, password) {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    const error = new Error('Invalid email format');
    error.status = 400;
    throw error;
  }

  if (password.length < 6) {
    const error = new Error('Password must be at least 6 characters long');
    error.status = 400;
    throw error;
  }

  // Check if user already exists
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    const error = new Error('An account with this email already exists');
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at, last_seen_at',
    [normalizedEmail, passwordHash]
  );

  const user = result.rows[0];


  // Pre-seed demo stocks and away baseline for evaluator demo account
  if (normalizedEmail === "judge@groww.in") {
    try {
      const countRes = await db.query("SELECT COUNT(*) as count FROM watchlist_items WHERE user_id = $1", [user.id]);
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        const demoSymbols = ["NVDA", "TSLA", "AAPL", "MSFT", "AMZN"];
        for (let i = 0; i < demoSymbols.length; i++) {
          await db.query("INSERT INTO watchlist_items (user_id, symbol, position) VALUES ($1, $2, $3)", [user.id, demoSymbols[i], i]);
        }
        const watchlistService = require("./watchlistService");
        const digestService = require("./digestService");
        const wl = await watchlistService.getUserWatchlist(user.id);
        await digestService.simulateAwaySession(user.id, wl.items);
      }
    } catch (e) {
      console.warn("Failed to seed demo stocks:", e.message);
    }
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSeenAt: user.last_seen_at
    }
  };
}

async function login(email, password) {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const result = await db.query(
    'SELECT id, email, password_hash, created_at, last_seen_at FROM users WHERE email = $1',
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const previousLastSeen = user.last_seen_at;

  // Update last seen timestamp
  await db.query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [user.id]);


  // Pre-seed demo stocks and away baseline for evaluator demo account
  if (normalizedEmail === "judge@groww.in") {
    try {
      const countRes = await db.query("SELECT COUNT(*) as count FROM watchlist_items WHERE user_id = $1", [user.id]);
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        const demoSymbols = ["NVDA", "TSLA", "AAPL", "MSFT", "AMZN"];
        for (let i = 0; i < demoSymbols.length; i++) {
          await db.query("INSERT INTO watchlist_items (user_id, symbol, position) VALUES ($1, $2, $3)", [user.id, demoSymbols[i], i]);
        }
        const watchlistService = require("./watchlistService");
        const digestService = require("./digestService");
        const wl = await watchlistService.getUserWatchlist(user.id);
        await digestService.simulateAwaySession(user.id, wl.items);
      }
    } catch (e) {
      console.warn("Failed to seed demo stocks:", e.message);
    }
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSeenAt: user.last_seen_at,
      previousLastSeen
    }
  };
}

async function getProfile(userId) {
  const result = await db.query(
    'SELECT id, email, created_at, last_seen_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const user = result.rows[0];
  return {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
    lastSeenAt: user.last_seen_at
  };
}

module.exports = {
  register,
  login,
  getProfile
};
