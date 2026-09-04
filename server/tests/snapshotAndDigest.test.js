const { buildDigest, dismissDigest, formatDuration } = require('../src/services/digestService');
const { captureSnapshot, getLatestSnapshot } = require('../src/services/snapshotService');
const db = require('../src/db');

describe('Snapshot and "While You Were Away" Digest System', () => {
  const testUserId = 'test-user-uuid-1234';

  beforeEach(() => {
    // Clear in-memory snapshots
    db.memoryStore.snapshots.clear();
  });

  test('formatDuration formats milliseconds into human-readable intervals', () => {
    expect(formatDuration(45 * 1000)).toBe('45 seconds');
    expect(formatDuration(120 * 1000)).toBe('2 minutes');
    expect(formatDuration(3 * 3600 * 1000)).toBe('3 hours');
    expect(formatDuration(48 * 3600 * 1000)).toBe('2 days');
  });

  test('First session returns welcome state and captures initial baseline snapshot', async () => {
    const watchlist = [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 180.0, attention_score: 30 }
    ];

    const digest = await buildDigest(testUserId, watchlist);
    expect(digest.hasDigest).toBe(false);
    expect(digest.message).toContain('Baseline snapshot recorded');

    // Verify snapshot was created
    const snap = await getLatestSnapshot(testUserId);
    expect(snap).not.toBeNull();
    expect(snap.data.AAPL.price).toBe(180.0);
  });

  test('Detects meaningful price surge and attention score spike in digest', async () => {
    // 1. Initial snapshot
    await captureSnapshot(testUserId, [
      { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 100.0, volume: 10000000, attention_score: 25.0 }
    ]);

    // 2. Return later: price increased to 110 (+10%), volume jumped 3x, attention score up to 82 (+57 pts)
    const currentWatchlist = [
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corp.',
        price: 110.0,
        volume: 30000000,
        attention_score: 82.0,
        headline: 'Massive volume surge to fresh high'
      }
    ];

    const digest = await buildDigest(testUserId, currentWatchlist);
    expect(digest.hasDigest).toBe(true);
    expect(digest.summary.urgentCount).toBe(1);

    const nvdaChange = digest.changes.find(c => c.symbol === 'NVDA');
    expect(nvdaChange).toBeDefined();
    expect(nvdaChange.urgency).toBe('urgent');
    expect(nvdaChange.priceDelta).toBe(10.0);
    expect(nvdaChange.priceDeltaPct).toBe(10.0);
    expect(nvdaChange.scoreDelta).toBe(57.0);
    expect(nvdaChange.badges).toContain('+57 Score Spike');
  });

  test('Dismissing digest captures new baseline and resets diff', async () => {
    const currentWatchlist = [
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 220.0, volume: 50000000, attention_score: 45.0 }
    ];

    const res = await dismissDigest(testUserId, currentWatchlist);
    expect(res.dismissed).toBe(true);
    expect(res.newSnapshotAt).toBeDefined();

    // Immediately requesting digest again with same data has no urgency
    const nextDigest = await buildDigest(testUserId, currentWatchlist);
    expect(nextDigest.summary.urgentCount).toBe(0);
    expect(nextDigest.summary.notableCount).toBe(0);
  });
});
