const snapshotService = require('./snapshotService');

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Generate a smart "While You Were Away" digest by diffing current state against last snapshot
 */
async function buildDigest(userId, currentWatchlistItems = []) {
  const latestSnapshot = await snapshotService.getLatestSnapshot(userId);

  if (!latestSnapshot || !latestSnapshot.data || Object.keys(latestSnapshot.data).length === 0) {
    // First session: capture initial snapshot as baseline
    if (currentWatchlistItems.length > 0) {
      await snapshotService.captureSnapshot(userId, currentWatchlistItems);
    }
    return {
      hasDigest: false,
      message: 'Welcome! Baseline snapshot recorded. When you return later, this space will highlight meaningful changes.',
      changes: []
    };
  }

  const oldData = latestSnapshot.data;
  const capturedDate = new Date(latestSnapshot.capturedAt);
  const now = new Date();
  const timeElapsedMs = Math.max(0, now.getTime() - capturedDate.getTime());
  const timeAwayText = formatDuration(timeElapsedMs);

  const changes = [];

  for (const current of currentWatchlistItems) {
    const symbol = current.symbol;
    const old = oldData[symbol];

    // If newly added after last snapshot
    if (!old) {
      changes.push({
        symbol,
        name: current.name || symbol,
        type: 'NEW_ADDITION',
        urgency: 'minor',
        currentPrice: Number(current.price),
        oldPrice: null,
        priceDelta: 0,
        priceDeltaPct: 0,
        currentScore: Number(current.attention_score) || 0,
        oldScore: 0,
        scoreDelta: 0,
        reason: 'Added to your watchlist recently',
        badges: ['New in Watchlist']
      });
      continue;
    }

    const currentPrice = Number(current.price) || 0;
    const oldPrice = Number(old.price) || 0;
    const priceDelta = Number((currentPrice - oldPrice).toFixed(2));
    const priceDeltaPct = oldPrice > 0 
      ? Number((((currentPrice - oldPrice) / oldPrice) * 100).toFixed(2)) 
      : 0;

    const currentScore = Number(current.attention_score) || 0;
    const oldScore = Number(old.attention_score) || 0;
    const scoreDelta = Number((currentScore - oldScore).toFixed(1));

    const currentVol = Number(current.volume) || 0;
    const oldVol = Number(old.volume) || 0;
    const volumeRatio = oldVol > 0 ? Number((currentVol / oldVol).toFixed(1)) : 1.0;

    // Detect significance criteria
    const badges = [];
    let urgency = 'minor';
    const reasons = [];

    // Attention Score shift
    if (scoreDelta >= 25) {
      urgency = 'urgent';
      badges.push(`+${scoreDelta} Score Spike`);
      reasons.push(`Attention score surged +${scoreDelta} pts`);
    } else if (scoreDelta >= 12) {
      if (urgency !== 'urgent') urgency = 'notable';
      badges.push(`+${scoreDelta} Score Rise`);
      reasons.push(`Attention score gained +${scoreDelta} pts`);
    } else if (scoreDelta <= -20) {
      badges.push(`${scoreDelta} Score Cooloff`);
      reasons.push('Attention score normalized');
    }

    // Meaningful Price Moves since user left
    if (Math.abs(priceDeltaPct) >= 3.0) {
      urgency = 'urgent';
      badges.push(`${priceDeltaPct >= 0 ? '+' : ''}${priceDeltaPct.toFixed(1)}% Move`);
      reasons.push(`Price moved ${priceDeltaPct >= 0 ? '+' : ''}${priceDeltaPct.toFixed(2)}% ($${oldPrice} → $${currentPrice})`);
    } else if (Math.abs(priceDeltaPct) >= 1.5) {
      if (urgency !== 'urgent') urgency = 'notable';
      badges.push(`${priceDeltaPct >= 0 ? '+' : ''}${priceDeltaPct.toFixed(1)}% Shift`);
      reasons.push(`Price drifted ${priceDeltaPct >= 0 ? '+' : ''}${priceDeltaPct.toFixed(2)}%`);
    }

    // Volume surges since user left
    if (volumeRatio >= 2.5 && currentVol > 500000) {
      if (urgency !== 'urgent') urgency = 'notable';
      badges.push(`${volumeRatio}x Volume Surge`);
      reasons.push(`Trading volume expanded ${volumeRatio}x`);
    }

    // High current attention score
    if (currentScore >= 70 && urgency !== 'urgent') {
      urgency = 'urgent';
      badges.push('High Attention (70+)');
    }

    // If stock has meaningful headline from current engine
    if (current.headline && reasons.length === 0 && currentScore >= 40) {
      reasons.push(current.headline);
      if (currentScore >= 65) urgency = 'urgent';
      else urgency = 'notable';
    }

    if (reasons.length === 0) {
      reasons.push(`Holding steady (${priceDeltaPct >= 0 ? '+' : ''}${priceDeltaPct.toFixed(2)}% change)`);
    }

    changes.push({
      symbol,
      name: current.name || symbol,
      urgency,
      currentPrice,
      oldPrice,
      priceDelta,
      priceDeltaPct,
      currentScore,
      oldScore,
      scoreDelta,
      currentVolume: currentVol,
      volumeRatio,
      reason: reasons.join(' • '),
      badges: badges.length > 0 ? badges : ['Steady']
    });
  }

  // Sort changes: Urgent first, then Notable, then descending by absolute priceDeltaPct
  const urgencyWeight = { urgent: 3, notable: 2, minor: 1 };
  changes.sort((a, b) => {
    const diff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    if (diff !== 0) return diff;
    return Math.abs(b.priceDeltaPct) - Math.abs(a.priceDeltaPct);
  });

  const urgentCount = changes.filter(c => c.urgency === 'urgent').length;
  const notableCount = changes.filter(c => c.urgency === 'notable').length;

  // Only surface digest if there's at least one notable/urgent change OR user was away for > 15 mins
  const shouldSurface = urgentCount > 0 || notableCount > 0 || timeElapsedMs > 15 * 60 * 1000;

  return {
    hasDigest: shouldSurface,
    lastVisitAt: latestSnapshot.capturedAt,
    timeAwayText,
    summary: {
      totalWatched: currentWatchlistItems.length,
      urgentCount,
      notableCount,
      minorCount: changes.length - urgentCount - notableCount
    },
    changes
  };
}

/**
 * Dismiss digest: user reviewed it, so we reset baseline with a new snapshot!
 */
async function dismissDigest(userId, currentWatchlistItems = []) {
  const snapshot = await snapshotService.captureSnapshot(userId, currentWatchlistItems);
  return {
    dismissed: true,
    newSnapshotAt: snapshot.captured_at
  };
}


/**
 * Simulate an away session from 3 hours ago with realistic price & score changes
 */
async function simulateAwaySession(userId, currentWatchlistItems = []) {
  if (!currentWatchlistItems || currentWatchlistItems.length === 0) {
    return { success: false, message: 'No items in watchlist to simulate' };
  }

  const threeHoursAgo = new Date(Date.now() - 3.25 * 3600 * 1000).toISOString();
  const simulatedData = {};

  currentWatchlistItems.forEach((item, index) => {
    const currentPrice = Number(item.price) || 100;
    const currentScore = Number(item.attention_score) || 40;
    const currentVol = Number(item.volume) || 10000000;

    let priceMultiplier = 1.0;
    let scoreOffset = 0;
    let volMultiplier = 1.0;

    if (index === 0) {
      // Top mover: Urgent (+5.8% move, 2.5x volume surge, +28 score spike)
      priceMultiplier = 0.945;
      scoreOffset = -28;
      volMultiplier = 0.4;
    } else if (index === 1) {
      // Second mover: Notable (+3.2% move, score gain)
      priceMultiplier = 0.969;
      scoreOffset = -16;
      volMultiplier = 0.6;
    } else if (index === 2) {
      // Third mover: Notable (+1.9% shift)
      priceMultiplier = 0.981;
      scoreOffset = -12;
      volMultiplier = 0.8;
    } else {
      // Steady
      priceMultiplier = 0.998;
      scoreOffset = -2;
      volMultiplier = 0.95;
    }

    const oldPrice = Number((currentPrice * priceMultiplier).toFixed(2));
    const oldScore = Math.max(5, currentScore + scoreOffset);
    const oldVol = Math.floor(currentVol * volMultiplier);

    simulatedData[item.symbol] = {
      symbol: item.symbol,
      name: item.name || item.symbol,
      price: oldPrice,
      prev_close: oldPrice,
      change_pct: 0,
      volume: oldVol,
      avg_volume: Number(item.avgVolume || item.avg_volume || currentVol),
      attention_score: oldScore,
      urgency: 'minor',
      captured_at: threeHoursAgo
    };
  });

  const db = require('../db');
  await db.query(
    'INSERT INTO snapshots (user_id, data, captured_at) VALUES (, , )',
    [userId, JSON.stringify(simulatedData), threeHoursAgo]
  );

  return {
    success: true,
    message: 'Simulated 3-hour away session generated',
    snapshotAt: threeHoursAgo
  };
}

module.exports = {
  buildDigest,
  dismissDigest,
  simulateAwaySession,
  formatDuration
};
