const {
  calculateAttentionScore,
  computePriceMoveSignal,
  computeVolumeSignal,
  computeLevelBreakSignal,
  computeSectorDivergenceSignal,
  calculateStdDev
} = require('../src/services/attentionEngine');

describe('Attention Score Engine', () => {
  test('Quiet trading day yields low attention score (minor)', () => {
    const stock = {
      symbol: 'JNJ',
      price: 155.0,
      prev_close: 154.9,
      change_pct: 0.06,
      volume: 4500000,
      avg_volume: 5000000,
      std_dev: 1.2,
      sector: 'Healthcare',
      week_52_high: 175.0,
      week_52_low: 140.0
    };

    const result = calculateAttentionScore(stock);
    expect(result.score).toBeLessThan(35);
    expect(result.urgency).toBe('minor');
    expect(result.badgeColor).toBe('#64748b');
  });

  test('Massive breakout with volume anomaly yields urgent attention (> 70)', () => {
    const stock = {
      symbol: 'NVDA',
      price: 140.0,
      prev_close: 130.0,
      change_pct: 7.69,
      volume: 120000000,
      avg_volume: 35000000, // 3.4x volume surge
      std_dev: 2.2, // ~3.5 std dev move!
      sector: 'Technology',
      week_52_high: 140.0, // At 52w high!
      week_52_low: 70.0
    };

    const result = calculateAttentionScore(stock);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.urgency).toBe('urgent');
    expect(result.badgeColor).toBe('#ef4444');
    expect(result.headline).toContain('52-Week High');
  });

  test('Volume anomaly signal scales monotonically with volume ratio', () => {
    const low = computeVolumeSignal(2000000, 5000000);
    const normal = computeVolumeSignal(5000000, 5000000);
    const elevated = computeVolumeSignal(10000000, 5000000);
    const extreme = computeVolumeSignal(25000000, 5000000);

    expect(low.score).toBeLessThan(normal.score);
    expect(normal.score).toBeLessThan(elevated.score);
    expect(elevated.score).toBeLessThan(extreme.score);
    expect(extreme.score).toBeGreaterThanOrEqual(80);
  });

  test('Sector divergence detects decoupling from broader index', () => {
    // Tech sector is up +0.8%
    // Stock is down -3.5%
    const divergence = computeSectorDivergenceSignal(-3.5, 'Technology');
    expect(divergence.divergence).toBeCloseTo(4.3, 1);
    expect(divergence.score).toBeGreaterThanOrEqual(90);
    expect(divergence.explanation).toContain('Decoupling');
  });

  test('Gracefully handles missing or edge-case inputs without throwing', () => {
    expect(() => calculateAttentionScore({})).not.toThrow();
    const result = calculateAttentionScore({
      price: 0,
      volume: 0,
      avg_volume: 0
    });
    expect(result.score).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('calculateStdDev calculates accurate historical volatility', () => {
    const returns = [1.2, -0.8, 0.5, -1.5, 2.1, 0.2, -0.4];
    const stdDev = calculateStdDev(returns);
    expect(stdDev).toBeGreaterThan(0.5);
    expect(stdDev).toBeLessThan(3.0);
  });
});
