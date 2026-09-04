const express = require('express');
const router = express.Router();
const watchlistService = require('../services/watchlistService');
const { authenticate } = require('../middleware/auth');

// All watchlist routes require authentication
router.use(authenticate);

// GET /api/watchlist
router.get('/', async (req, res, next) => {
  try {
    const { sortBy } = req.query;
    const data = await watchlistService.getUserWatchlist(req.user.id, { sortBy });
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/watchlist
router.post('/', async (req, res, next) => {
  try {
    const { symbol } = req.body;
    const item = await watchlistService.addStock(req.user.id, symbol);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/watchlist/:symbol
router.delete('/:symbol', async (req, res, next) => {
  try {
    const result = await watchlistService.removeStock(req.user.id, req.params.symbol);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/watchlist/reorder
router.patch('/reorder', async (req, res, next) => {
  try {
    const { symbols } = req.body;
    const result = await watchlistService.reorderWatchlist(req.user.id, symbols);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
