const axios = require('axios');
const db = require('../db');
const { calculateAttentionScore } = require('./attentionEngine');

// Popular stock registry with fundamental sector baselines for instant demoing & search
const STOCK_REGISTRY = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', basePrice: 228.40, avgVolume: 48000000, stdDev: 1.6 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', basePrice: 124.60, avgVolume: 72000000, stdDev: 2.8 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', basePrice: 415.20, avgVolume: 21000000, stdDev: 1.5 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', basePrice: 168.90, avgVolume: 24000000, stdDev: 1.8 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', basePrice: 186.50, avgVolume: 32000000, stdDev: 2.1 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', basePrice: 212.80, avgVolume: 65000000, stdDev: 3.4 },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', basePrice: 512.40, avgVolume: 16000000, stdDev: 2.3 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services', basePrice: 218.10, avgVolume: 9500000, stdDev: 1.3 },
  { symbol: 'LLY', name: 'Eli Lilly and Company', sector: 'Healthcare', basePrice: 940.30, avgVolume: 3200000, stdDev: 1.9 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', basePrice: 158.20, avgVolume: 12000000, stdDev: 2.5 },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Defensive', basePrice: 76.50, avgVolume: 14000000, stdDev: 1.1 },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', basePrice: 114.80, avgVolume: 13000000, stdDev: 1.7 },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', sector: 'Energy', basePrice: 2980.50, avgVolume: 8500000, stdDev: 1.5 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'Technology', basePrice: 4210.00, avgVolume: 2200000, stdDev: 1.3 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Limited', sector: 'Financial Services', basePrice: 1650.25, avgVolume: 14000000, stdDev: 1.4 },
  { symbol: 'INFY', name: 'Infosys Limited', sector: 'Technology', basePrice: 1910.75, avgVolume: 6200000, stdDev: 1.7 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Limited', sector: 'Financial Services', basePrice: 1215.80, avgVolume: 11000000, stdDev: 1.6 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Limited', sector: 'Communication Services', basePrice: 1540.30, avgVolume: 4900000, stdDev: 1.5 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'General', basePrice: 554.30, avgVolume: 52000000, stdDev: 0.9 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', sector: 'Technology', basePrice: 478.60, avgVolume: 38000000, stdDev: 1.2 }
];

// In-Memory cache of current market data: symbol -> data
const memoryMarketCache = new Map();
let lastMarketFetchTime = new Date();

/**
 * Generate 7-day sparkline history around base price
 */
function generateSparkline(currentPrice, prevClose) {
  const points = [];
  let p = prevClose * 0.97;
  for (let i = 0; i < 6; i++) {
    const drift = (Math.random() - 0.48) * 0.02 * p;
    p = Math.max(1, p + drift);
    points.push(Number(p.toFixed(2)));
  }
  points.push(Number(prevClose.toFixed(2)));
  points.push(Number(currentPrice.toFixed(2)));
  return points;
}

/**
 * Fetch live data from Finnhub if API key is provided
 */
async function fetchFinnhubQuote(symbol, apiKey) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
    const res = await axios.get(url, { timeout: 4000 });
    const data = res.data;
    if (!data || data.c === 0 || data.c === null) {
      return null;
    }
    return {
      price: data.c,
      change: data.d,
      changePct: data.dp,
      dayHigh: data.h,
      dayLow: data.l,
      dayOpen: data.o,
      prevClose: data.pc,
      updatedAt: new Date().toISOString(),
      source: 'finnhub_live'
    };
  } catch (err) {
    console.warn(`[Finnhub API] Failed to fetch quote for ${symbol}:`, err.message);
    return null;
  }
}

/**
 * Generate realistic simulated live tick when API key is not present or API is throttled
 */
function generateRealisticLiveTick(stockMeta) {
  const base = stockMeta.basePrice;
  const std = stockMeta.stdDev || 1.8;
  
  // Random walk with occasional momentum/volatility spike
  const isAnomaly = Math.random() < 0.15; // 15% chance of unusual event for demo interest!
  const pctMove = isAnomaly 
    ? (Math.random() > 0.45 ? 1 : -1) * (std * (1.8 + Math.random() * 1.5))
    : (Math.random() - 0.49) * (std * 0.8);

  const price = Number((base * (1 + pctMove / 100)).toFixed(2));
  const prevClose = base;
  const change = Number((price - prevClose).toFixed(2));
  const changePct = Number(pctMove.toFixed(2));

  // Volume simulation
  const volumeMultiplier = isAnomaly ? (2.2 + Math.random() * 2.8) : (0.7 + Math.random() * 0.6);
  const volume = Math.floor(stockMeta.avgVolume * volumeMultiplier);

  const dayHigh = Number(Math.max(price, prevClose * (1 + Math.abs(changePct) / 100 * 1.05)).toFixed(2));
  const dayLow = Number(Math.min(price, prevClose * (1 - Math.abs(changePct) / 100 * 1.05)).toFixed(2));
  const week52High = Number((base * 1.18).toFixed(2));
  const week52Low = Number((base * 0.78).toFixed(2));

  return {
    symbol: stockMeta.symbol,
    name: stockMeta.name,
    sector: stockMeta.sector,
    price,
    prevClose,
    change,
    changePct,
    volume,
    avgVolume: stockMeta.avgVolume,
    stdDev: stockMeta.stdDev,
    dayHigh,
    dayLow,
    week52High,
    week52Low,
    sparkline: generateSparkline(price, prevClose),
    updatedAt: new Date().toISOString(),
    source: 'simulated_live'
  };
}

/**
 * Get quote for a single symbol (from memory cache or fetched)
 */
async function getQuote(symbol) {
  const cleanSymbol = symbol.toUpperCase().trim();
  const cached = memoryMarketCache.get(cleanSymbol);

  if (cached) {
    const ageSeconds = (Date.now() - new Date(cached.updated_at || cached.updatedAt).getTime()) / 1000;
    if (ageSeconds < 30) {
      return cached;
    }
  }

  // Look for metadata
  let meta = STOCK_REGISTRY.find(s => s.symbol === cleanSymbol);
  if (!meta) {
    meta = {
      symbol: cleanSymbol,
      name: `${cleanSymbol} Equity`,
      sector: 'General',
      basePrice: 100.0,
      avgVolume: 10000000,
      stdDev: 2.0
    };
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  let quote = null;

  if (apiKey) {
    const live = await fetchFinnhubQuote(cleanSymbol, apiKey);
    if (live) {
      quote = {
        symbol: cleanSymbol,
        name: meta.name,
        sector: meta.sector,
        price: live.price,
        prevClose: live.prevClose,
        change: live.change,
        changePct: live.changePct,
        volume: meta.avgVolume,
        avgVolume: meta.avgVolume,
        stdDev: meta.stdDev,
        dayHigh: live.dayHigh,
        dayLow: live.dayLow,
        week52High: live.dayHigh * 1.15,
        week52Low: live.dayLow * 0.85,
        sparkline: generateSparkline(live.price, live.prevClose),
        updatedAt: live.updatedAt,
        source: live.source
      };
    }
  }

  if (!quote) {
    quote = generateRealisticLiveTick(meta);
  }

  // Compute attention score
  const attention = calculateAttentionScore(quote);
  quote.attention_score = attention.score;
  quote.urgency = attention.urgency;
  quote.badgeColor = attention.badgeColor;
  quote.headline = attention.headline;
  quote.signals = attention.signals;

  memoryMarketCache.set(cleanSymbol, quote);
  lastMarketFetchTime = new Date();

  return quote;
}

/**
 * Batch refresh market data for an array of symbols
 */
async function refreshSymbols(symbols = []) {
  const results = {};
  for (const sym of symbols) {
    try {
      const q = await getQuote(sym);
      results[sym.toUpperCase()] = q;
    } catch (err) {
      console.warn(`[Market Data] Error updating ${sym}:`, err.message);
    }
  }
  return results;
}

/**
 * Search available stocks matching user query
 */
function searchStocks(query = '') {
  const q = query.trim().toLowerCase();
  if (!q) return STOCK_REGISTRY.slice(0, 8);

  return STOCK_REGISTRY.filter(stock => 
    stock.symbol.toLowerCase().includes(q) ||
    stock.name.toLowerCase().includes(q) ||
    stock.sector.toLowerCase().includes(q)
  ).slice(0, 10);
}

/**
 * Get current overall market status & data freshness
 */
function getMarketStatus() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

  // Approximate US Market Hours: 13:30 UTC to 20:00 UTC, Mon-Fri
  const isWeekend = day === 0 || day === 6;
  const isMarketHours = !isWeekend && (utcHours > 13 || (utcHours === 13 && utcMinutes >= 30)) && utcHours < 20;

  const freshnessSeconds = Math.max(0, Math.floor((now.getTime() - lastMarketFetchTime.getTime()) / 1000));
  
  let freshnessStatus = 'fresh'; // < 30s
  if (freshnessSeconds > 120) {
    freshnessStatus = 'stale'; // > 2 min
  } else if (freshnessSeconds > 45) {
    freshnessStatus = 'delayed'; // 45s - 120s
  }

  return {
    isOpen: isMarketHours,
    statusText: isMarketHours ? 'Market Open' : 'Market Closed (After Hours)',
    freshnessSeconds,
    freshnessStatus,
    lastUpdated: lastMarketFetchTime.toISOString(),
    apiConfigured: Boolean(process.env.FINNHUB_API_KEY),
    cachedSymbolsCount: memoryMarketCache.size
  };
}

module.exports = {
  getQuote,
  refreshSymbols,
  searchStocks,
  getMarketStatus,
  STOCK_REGISTRY,
  memoryMarketCache
};
