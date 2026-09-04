require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection, isFallbackMode } = require('./db');
const { runMigrations } = require('./db/migrate');
const { startMarketFetcher } = require('./jobs/marketFetcher');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const watchlistRoutes = require('./routes/watchlist');
const marketRoutes = require('./routes/market');
const digestRoutes = require('./routes/digest');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and standard middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: isFallbackMode() ? 'in-memory-resilient-mode' : 'postgresql-connected',
    version: '1.0.0'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/digest', digestRoutes);

// Centralized error handler
app.use(errorHandler);

// Bootstrap server
async function bootstrap() {
  console.log('---------------------------------------------------------');
  console.log('🚀 Starting Smart Market Watchlist API (Groww Code 2026)');
  console.log('---------------------------------------------------------');

  // Attempt database connection & run initial migration if connected
  const connected = await testConnection();
  if (connected) {
    await runMigrations();
  }

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`[API Server] Running on http://localhost:${PORT}`);
    console.log(`[Database] Mode: ${isFallbackMode() ? 'InMemory Resilient Fallback' : 'PostgreSQL Pool'}`);
  });

  // Start background market data fetcher
  startMarketFetcher();

  return { app, server };
}

if (require.main === module) {
  bootstrap().catch(err => {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  });
}

module.exports = { app, bootstrap };
