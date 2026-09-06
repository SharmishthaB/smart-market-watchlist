const express = require('express');
const router = express.Router();
const digestService = require('../services/digestService');
const watchlistService = require('../services/watchlistService');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /api/digest/dismiss
router.post('/dismiss', async (req, res, next) => {
  try {
    const watchlistData = await watchlistService.getUserWatchlist(req.user.id);
    const result = await digestService.dismissDigest(req.user.id, watchlistData.items);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/digest/snapshot (manual checkpoint)
router.post('/snapshot', async (req, res, next) => {
  try {
    const watchlistData = await watchlistService.getUserWatchlist(req.user.id);
    const result = await digestService.dismissDigest(req.user.id, watchlistData.items);
    res.status(200).json({ success: true, message: 'Snapshot checkpoint recorded', result });
  } catch (err) {
    next(err);
  }
});


// POST /api/digest/simulate (simulate a 3h away session)
router.post('/simulate', async (req, res, next) => {
  try {
    const watchlistData = await watchlistService.getUserWatchlist(req.user.id);
    const result = await digestService.simulateAwaySession(req.user.id, watchlistData.items);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
