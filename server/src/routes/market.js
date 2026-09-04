const express = require('express');
const router = express.Router();
const marketDataService = require('../services/marketDataService');

// GET /api/market/search?q=
router.get('/search', (req, res) => {
  const query = req.query.q || '';
  const results = marketDataService.searchStocks(query);
  res.status(200).json({ results });
});

// GET /api/market/quote/:symbol
router.get('/quote/:symbol', async (req, res, next) => {
  try {
    const quote = await marketDataService.getQuote(req.params.symbol);
    res.status(200).json({ quote });
  } catch (err) {
    next(err);
  }
});

// GET /api/market/status
router.get('/status', (req, res) => {
  const status = marketDataService.getMarketStatus();
  res.status(200).json(status);
});

module.exports = router;
