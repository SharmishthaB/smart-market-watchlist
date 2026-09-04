-- Enable pgcrypto for gen_random_uuid() if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Watchlist items
CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  position INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_user_symbol UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist_items(symbol);

-- Snapshots table (frozen watchlist states for diffing)
CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_captured ON snapshots(user_id, captured_at DESC);

-- Market Data Cache table (global cache across all users)
CREATE TABLE IF NOT EXISTS market_data_cache (
  symbol VARCHAR(10) PRIMARY KEY,
  name VARCHAR(255),
  price NUMERIC(14, 4),
  prev_close NUMERIC(14, 4),
  change NUMERIC(14, 4),
  change_pct NUMERIC(8, 4),
  volume BIGINT DEFAULT 0,
  avg_volume BIGINT DEFAULT 0,
  day_high NUMERIC(14, 4),
  day_low NUMERIC(14, 4),
  week_52_high NUMERIC(14, 4),
  week_52_low NUMERIC(14, 4),
  market_cap BIGINT DEFAULT 0,
  sector VARCHAR(100),
  attention_score NUMERIC(5, 2) DEFAULT 0,
  attention_signals JSONB DEFAULT '{}'::jsonb,
  sparkline JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'live'
);

-- Price History for rolling volatility, moving averages, and technical indicators
CREATE TABLE IF NOT EXISTS price_history (
  symbol VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  close NUMERIC(14, 4) NOT NULL,
  volume BIGINT DEFAULT 0,
  PRIMARY KEY(symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_price_history_symbol_date ON price_history(symbol, date DESC);
