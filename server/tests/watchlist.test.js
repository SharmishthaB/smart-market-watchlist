const { addStock, getUserWatchlist, removeStock } = require('../src/services/watchlistService');
const db = require('../src/db');

describe('Watchlist Service & In-Memory DB Handlers', () => {
  const userId = 'user-test-uuid-456';

  beforeEach(() => {
    db.memoryStore.watchlist.clear();
  });

  test('Adding first stock succeeds', async () => {
    const result = await addStock(userId, 'AAPL');
    expect(result.symbol).toBe('AAPL');
  });

  test('Adding a second, different stock succeeds and is not blocked by 409 conflict', async () => {
    await addStock(userId, 'AAPL');
    const result2 = await addStock(userId, 'NVDA');
    expect(result2.symbol).toBe('NVDA');

    const watchlist = await getUserWatchlist(userId);
    expect(watchlist.items.length).toBe(2);
    const symbols = watchlist.items.map(i => i.symbol);
    expect(symbols).toContain('AAPL');
    expect(symbols).toContain('NVDA');
  });

  test('Adding the exact same stock throws 409 conflict', async () => {
    await addStock(userId, 'AAPL');
    await expect(addStock(userId, 'AAPL')).rejects.toThrow('already in your watchlist');
  });

  test('Removing stock removes it from watchlist', async () => {
    await addStock(userId, 'AAPL');
    await addStock(userId, 'MSFT');
    await removeStock(userId, 'AAPL');

    const watchlist = await getUserWatchlist(userId);
    expect(watchlist.items.length).toBe(1);
    expect(watchlist.items[0].symbol).toBe('MSFT');
  });
});
