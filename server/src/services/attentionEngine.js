/**
 * Attention Score Engine
 * Computes a context-aware 0-100 score indicating how urgently a stock
 * deserves the user's attention right now.
 *
 * Components:
 * 1. Relative Volatility (Z-Score of price change vs stock's historical std dev) - 35%
 * 2. Volume Anomaly (Today's volume vs 30-day average volume) - 25%
 * 3. Technical Level Breaks (52-week high/low, key moving averages) - 25%
 * 4. Sector Divergence (Performance relative to sector peers) - 15%
 */

// Default baseline volatility if insufficient history is available (typical equity std dev ~1.8%)
const DEFAULT_DAILY_VOLATILITY = 1.8;

// Sector benchmark performance defaults (can be updated dynamically by fetcher)
const SECTOR_PERFORMANCE = {
  'Technology': 0.8,
  'Financial Services': -0.2,
  'Consumer Cyclical': 0.4,
  'Healthcare': 0.1,
  'Energy': -0.7,
  'Communication Services': 0.5,
  'Industrials': 0.2,
  'Consumer Defensive': -0.1,
  'Utilities': -0.3,
  'Real Estate': -0.4,
  'Basic Materials': 0.3,
  'General': 0.0
};

/**
 * Calculate standard deviation from historical daily returns
 */
function calculateStdDev(dailyReturns) {
  if (!dailyReturns || dailyReturns.length < 5) return DEFAULT_DAILY_VOLATILITY;
  const n = dailyReturns.length;
  const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / n;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1);
  const std = Math.sqrt(variance);
  return std > 0.1 ? std : DEFAULT_DAILY_VOLATILITY;
}

/**
 * 1. Price Move Signal (Weight: 35%)
 * Evaluates the Z-score of today's price move relative to its own normal variance.
 * A 2% move on a stable utility stock is huge; on a volatile tech stock it's ordinary.
 */
function computePriceMoveSignal(changePct, stdDev) {
  const absMove = Math.abs(changePct);
  const effectiveStdDev = stdDev || DEFAULT_DAILY_VOLATILITY;
  const zScore = absMove / effectiveStdDev;

  // Z = 0 -> 0 pts
  // Z = 1.0 (1 std dev move) -> 35 pts
  // Z = 2.0 (2 std dev move, top 5% probability) -> 75 pts
  // Z >= 3.0 (3 std dev move, statistically extreme anomaly) -> 100 pts
  let score = 0;
  if (zScore <= 1.0) {
    score = zScore * 35;
  } else if (zScore <= 2.0) {
    score = 35 + (zScore - 1.0) * 40;
  } else {
    score = Math.min(100, 75 + (zScore - 2.0) * 25);
  }

  let explanation = '';
  if (zScore >= 2.5) {
    explanation = `Extreme statistical price anomaly (${absMove.toFixed(2)}% move is ${zScore.toFixed(1)}x normal daily volatility)`;
  } else if (zScore >= 1.5) {
    explanation = `Elevated price movement (${absMove.toFixed(2)}% move vs expected ±${effectiveStdDev.toFixed(1)}%)`;
  } else {
    explanation = `Price movement within normal historical range (±${effectiveStdDev.toFixed(1)}%)`;
  }

  return {
    rawZScore: Number(zScore.toFixed(2)),
    movePct: Number(changePct.toFixed(2)),
    stdDev: Number(effectiveStdDev.toFixed(2)),
    score: Number(score.toFixed(1)),
    weightedPoints: Number((score * 0.35).toFixed(1)),
    explanation
  };
}

/**
 * 2. Volume Anomaly Signal (Weight: 25%)
 * Evaluates current volume relative to 30-day average volume.
 * Volume confirms institutional interest or conviction behind a move.
 */
function computeVolumeSignal(currentVolume, avgVolume) {
  if (!avgVolume || avgVolume <= 0 || !currentVolume) {
    return {
      ratio: 1.0,
      score: 10,
      weightedPoints: 2.5,
      explanation: 'Normal trading activity (historical volume baseline building)'
    };
  }

  const ratio = currentVolume / avgVolume;
  let score = 0;

  // Ratio < 1.0 -> 0-20 pts
  // Ratio 1.0 to 2.0 -> 20-50 pts
  // Ratio 2.0 to 3.5 -> 50-80 pts
  // Ratio >= 3.5 -> 80-100 pts
  if (ratio <= 1.0) {
    score = Math.max(0, ratio * 20);
  } else if (ratio <= 2.0) {
    score = 20 + (ratio - 1.0) * 30;
  } else if (ratio <= 3.5) {
    score = 50 + ((ratio - 2.0) / 1.5) * 30;
  } else {
    score = Math.min(100, 80 + ((ratio - 3.5) / 2.5) * 20);
  }

  let explanation = '';
  if (ratio >= 3.0) {
    explanation = `Massive institutional volume surge (${ratio.toFixed(1)}x 30-day average volume)`;
  } else if (ratio >= 1.8) {
    explanation = `Unusually high trading volume (${ratio.toFixed(1)}x normal activity)`;
  } else if (ratio <= 0.4) {
    explanation = `Unusually quiet session (${(ratio * 100).toFixed(0)}% of typical volume)`;
  } else {
    explanation = `Normal market liquidity (${ratio.toFixed(1)}x average volume)`;
  }

  return {
    ratio: Number(ratio.toFixed(2)),
    currentVolume,
    avgVolume,
    score: Number(score.toFixed(1)),
    weightedPoints: Number((score * 0.25).toFixed(1)),
    explanation
  };
}

/**
 * 3. Technical Level Breaks Signal (Weight: 25%)
 * Detects crosses of critical price milestones:
 * - 52-week High/Low breakouts
 * - Day High/Low proximity
 * - Simple Moving Averages (20-day, 50-day)
 */
function computeLevelBreakSignal(price, data = {}) {
  const {
    week52High,
    week52Low,
    dayHigh,
    dayLow,
    prevClose,
    ma20,
    ma50
  } = data;

  const breaks = [];
  let rawScore = 0;

  if (price && week52High && price >= week52High * 0.995) {
    breaks.push({ type: '52W_HIGH', label: 'Near / At 52-Week High', weight: 45 });
    rawScore += 45;
  } else if (price && week52Low && price <= week52Low * 1.005) {
    breaks.push({ type: '52W_LOW', label: 'Near / At 52-Week Low', weight: 45 });
    rawScore += 45;
  }

  if (ma20 && prevClose) {
    if (prevClose < ma20 && price >= ma20) {
      breaks.push({ type: 'MA20_BULLISH', label: 'Crossed above 20-day SMA', weight: 25 });
      rawScore += 25;
    } else if (prevClose > ma20 && price <= ma20) {
      breaks.push({ type: 'MA20_BEARISH', label: 'Broken below 20-day SMA', weight: 25 });
      rawScore += 25;
    }
  }

  if (ma50 && prevClose) {
    if (prevClose < ma50 && price >= ma50) {
      breaks.push({ type: 'MA50_BULLISH', label: 'Crossed above 50-day SMA', weight: 30 });
      rawScore += 30;
    } else if (prevClose > ma50 && price <= ma50) {
      breaks.push({ type: 'MA50_BEARISH', label: 'Broken below 50-day SMA', weight: 30 });
      rawScore += 30;
    }
  }

  // Intraday range breakout: making fresh intraday highs on heavy momentum
  if (dayHigh && dayLow && dayHigh > dayLow && price >= dayHigh * 0.998) {
    breaks.push({ type: 'DAY_HIGH', label: 'Pounding intraday high', weight: 15 });
    rawScore += 15;
  }

  const score = Math.min(100, rawScore);

  let explanation = '';
  if (breaks.length > 0) {
    explanation = breaks.map(b => b.label).join(' • ');
  } else {
    explanation = 'Trading within established technical boundaries';
  }

  return {
    breaks,
    score: Number(score.toFixed(1)),
    weightedPoints: Number((score * 0.25).toFixed(1)),
    explanation
  };
}

/**
 * 4. Sector Divergence Signal (Weight: 15%)
 * Quantifies idiosyncratic alpha: is this stock moving with the tide,
 * or is it decoupling from its peer group?
 */
function computeSectorDivergenceSignal(stockChangePct, sector = 'General', sectorPerformanceMap = SECTOR_PERFORMANCE) {
  const sectorChange = sectorPerformanceMap[sector] !== undefined 
    ? sectorPerformanceMap[sector] 
    : (sectorPerformanceMap['General'] || 0);

  // Divergence = distance between stock's return and sector return
  // If sector is up +2% and stock is down -2%, divergence is 4% (significant decoupling)
  const divergence = Math.abs(stockChangePct - sectorChange);

  // 0% -> 0 pts
  // 1% divergence -> 25 pts
  // 2.5% divergence -> 65 pts
  // >= 4% divergence -> 100 pts
  let score = 0;
  if (divergence <= 1.0) {
    score = divergence * 25;
  } else if (divergence <= 2.5) {
    score = 25 + ((divergence - 1.0) / 1.5) * 40;
  } else {
    score = Math.min(100, 65 + ((divergence - 2.5) / 1.5) * 35);
  }

  let explanation = '';
  if (divergence >= 2.5) {
    const direction = stockChangePct > sectorChange ? 'outperforming' : 'lagging';
    explanation = `Decoupling from sector (${stockChangePct >= 0 ? '+' : ''}${stockChangePct.toFixed(1)}% vs ${sector} index ${sectorChange >= 0 ? '+' : ''}${sectorChange.toFixed(1)}%) — strong idiosyncratic driver`;
  } else {
    explanation = `Tracking in sync with broader ${sector || 'market'} sector`;
  }

  return {
    sector: sector || 'General',
    sectorChange: Number(sectorChange.toFixed(2)),
    stockChange: Number(stockChangePct.toFixed(2)),
    divergence: Number(divergence.toFixed(2)),
    score: Number(score.toFixed(1)),
    weightedPoints: Number((score * 0.15).toFixed(1)),
    explanation
  };
}

/**
 * Master Attention Score Calculator
 */
function calculateAttentionScore(stockData = {}) {
  const price = Number(stockData.price) || 0;
  const changePct = Number(stockData.change_pct) || Number(stockData.changePct) || 0;
  const currentVolume = Number(stockData.volume) || 0;
  const avgVolume = Number(stockData.avg_volume) || Number(stockData.avgVolume) || 0;
  const stdDev = Number(stockData.std_dev) || Number(stockData.stdDev) || DEFAULT_DAILY_VOLATILITY;
  const sector = stockData.sector || 'General';

  const priceMove = computePriceMoveSignal(changePct, stdDev);
  const volume = computeVolumeSignal(currentVolume, avgVolume);
  const levelBreak = computeLevelBreakSignal(price, {
    week52High: Number(stockData.week_52_high || stockData.week52High),
    week52Low: Number(stockData.week_52_low || stockData.week52Low),
    dayHigh: Number(stockData.day_high || stockData.dayHigh),
    dayLow: Number(stockData.day_low || stockData.dayLow),
    prevClose: Number(stockData.prev_close || stockData.prevClose),
    ma20: Number(stockData.ma20),
    ma50: Number(stockData.ma50)
  });
  const sectorDivergence = computeSectorDivergenceSignal(changePct, sector);

  // Total Score (0-100)
  const totalScore = Math.min(100, Math.max(0, 
    priceMove.weightedPoints +
    volume.weightedPoints +
    levelBreak.weightedPoints +
    sectorDivergence.weightedPoints
  ));

  const roundedScore = Number(totalScore.toFixed(1));

  // Urgency classification
  let urgency = 'minor'; // ⚪
  let badgeColor = '#64748b'; // slate
  if (roundedScore >= 65) {
    urgency = 'urgent'; // 🔴
    badgeColor = '#ef4444'; // red/orange pulse
  } else if (roundedScore >= 35) {
    urgency = 'notable'; // 🟡
    badgeColor = '#f59e0b'; // amber
  }

  // Synthesize top headline takeaway (prioritize critical structural breakouts)
  const keyTakeaways = [];
  if (levelBreak.breaks.length > 0) keyTakeaways.push(levelBreak.breaks[0].label);
  if (priceMove.rawZScore >= 2.0) keyTakeaways.push(`${Math.abs(changePct).toFixed(1)}% anomaly move`);
  if (volume.ratio >= 2.0) keyTakeaways.push(`${volume.ratio.toFixed(1)}x surge in volume`);
  if (sectorDivergence.divergence >= 2.5) keyTakeaways.push(`decoupling from ${sector}`);

  const headline = keyTakeaways.length > 0
    ? keyTakeaways.slice(0, 2).join(' with ')
    : (Math.abs(changePct) > 0.01 
        ? `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}% change, steady volume` 
        : 'Trading quietly near previous close');

  return {
    score: roundedScore,
    urgency,
    badgeColor,
    headline,
    signals: {
      priceMove,
      volume,
      levelBreak,
      sectorDivergence
    },
    weights: {
      priceMove: 0.35,
      volume: 0.25,
      levelBreak: 0.25,
      sectorDivergence: 0.15
    },
    evaluatedAt: new Date().toISOString()
  };
}

module.exports = {
  calculateAttentionScore,
  computePriceMoveSignal,
  computeVolumeSignal,
  computeLevelBreakSignal,
  computeSectorDivergenceSignal,
  calculateStdDev,
  DEFAULT_DAILY_VOLATILITY,
  SECTOR_PERFORMANCE
};
