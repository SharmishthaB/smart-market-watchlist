const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('groww_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('groww_token');
      localStorage.removeItem('groww_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/auth/me'),

  // Watchlist
  getWatchlist: (sortBy = 'attention') => request(`/watchlist?sortBy=${sortBy}`),
  addStock: (symbol) => request('/watchlist', { method: 'POST', body: JSON.stringify({ symbol }) }),
  removeStock: (symbol) => request(`/watchlist/${symbol}`, { method: 'DELETE' }),
  reorderWatchlist: (symbols) => request('/watchlist/reorder', { method: 'PATCH', body: JSON.stringify({ symbols }) }),

  // Market
  searchStocks: (query) => request(`/market/search?q=${encodeURIComponent(query)}`),
  getQuote: (symbol) => request(`/market/quote/${symbol}`),
  getMarketStatus: () => request('/market/status'),

  // Digest & Snapshots
  dismissDigest: () => request('/digest/dismiss', { method: 'POST' }),
  createSnapshotCheckpoint: () => request('/digest/snapshot', { method: 'POST' }),
  simulateAwayDigest: () => request('/digest/simulate', { method: 'POST' })
};
