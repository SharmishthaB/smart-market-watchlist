import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthGate } from './components/Auth/AuthGate';
import { Header } from './components/common/Header';
import { DigestCard } from './components/Dashboard/DigestCard';
import { AddStockBar } from './components/Dashboard/AddStockBar';
import { WatchlistTable } from './components/Dashboard/WatchlistTable';
import { StockDetailModal } from './components/Dashboard/StockDetailModal';
import { usePolling } from './hooks/usePolling';
import { api } from './api/client';
import { AlertTriangle, Layers } from 'lucide-react';

export default function App() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [watchlistData, setWatchlistData] = useState({ items: [], digest: null, totalCount: 0, maxLimit: 50 });
  const [marketStatus, setMarketStatus] = useState(null);
  const [sortBy, setSortBy] = useState('attention');
  const [selectedStock, setSelectedStock] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerMessage, setBannerMessage] = useState('');

  // Primary fetch routine
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [wl, status] = await Promise.all([
        api.getWatchlist(sortBy),
        api.getMarketStatus()
      ]);
      setWatchlistData(wl);
      setMarketStatus(status);
    } catch (err) {
      console.warn('Failed to load watchlist data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, sortBy]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Smart Polling (15s active, 60s background)
  const polling = usePolling(loadData, {
    enabled: isAuthenticated,
    activeInterval: 15000,
    backgroundInterval: 60000
  });

  // Watchlist Actions
  const handleAddStock = async (symbol) => {
    await api.addStock(symbol);
    await loadData();
  };

  const handleRemoveStock = async (symbol) => {
    await api.removeStock(symbol);
    await loadData();
  };

  const handleDismissDigest = async () => {
    try {
      await api.dismissDigest();
      // Update local state to hide digest card immediately
      setWatchlistData(prev => ({
        ...prev,
        digest: { ...prev.digest, hasDigest: false }
      }));
      setBannerMessage('Snapshot baseline recorded! Your next session will track changes from this moment.');
      setTimeout(() => setBannerMessage(''), 4000);
    } catch (err) {
      console.warn('Failed to dismiss digest:', err);
    }
  };

  const handleTakeSnapshot = async () => {
    try {
      await api.createSnapshotCheckpoint();
      setBannerMessage('Manual checkpoint captured. All deltas will measure against this state.');
      setTimeout(() => setBannerMessage(''), 4000);
    } catch (err) {
      console.warn('Failed to capture snapshot:', err);
    }
  };

  const handleSelectStock = (symbol) => {
    const stock = watchlistData.items.find(s => s.symbol === symbol);
    if (stock) setSelectedStock(stock);
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading Groww Pulse...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthGate />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        marketStatus={marketStatus}
        polling={polling}
        onTakeSnapshot={handleTakeSnapshot}
      />

      {/* Main Container */}
      <main style={{
        flex: 1,
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '24px 20px 48px 20px'
      }}>
        {/* Checkpoint Toast Banner */}
        {bannerMessage && (
          <div className="glass-panel animate-slide-down" style={{
            padding: '12px 18px',
            marginBottom: '20px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--accent-green)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Layers size={16} />
            {bannerMessage}
          </div>
        )}

        {/* Data Resilience Notice (if API key not configured or fallback active) */}
        {!marketStatus?.apiConfigured && (
          <div style={{
            padding: '10px 16px',
            borderRadius: '10px',
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            color: 'var(--accent-cyan)',
            fontSize: '0.78rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={15} />
              <span>
                <strong>Resilient Engine Active:</strong> Market simulation running with real volatility parameters. You can also supply your free Finnhub API key in <code>.env</code> for live market feeds.
              </span>
            </div>
            <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
              Zero Downtime Fallback
            </span>
          </div>
        )}

        {/* "While You Were Away" Digest */}
        <DigestCard
          digest={watchlistData.digest}
          onDismiss={handleDismissDigest}
          onSelectStock={handleSelectStock}
        />

        {/* Add Stock Bar with Limit Tracker */}
        <AddStockBar
          onAddStock={handleAddStock}
          watchlistCount={watchlistData.totalCount}
          maxLimit={watchlistData.maxLimit || 50}
        />

        {/* Watchlist Main Table */}
        <WatchlistTable
          items={watchlistData.items}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onRemoveStock={handleRemoveStock}
          onSelectStock={handleSelectStock}
          onQuickAdd={handleAddStock}
        />
      </main>

      {/* Quantitative Signal Attribution Modal */}
      <StockDetailModal
        stock={selectedStock}
        onClose={() => setSelectedStock(null)}
      />

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        Groww Code 2026 Submission · Built with React, Node.js, Express & PostgreSQL · Attention-Weighted Market Intelligence
      </footer>
    </div>
  );
}
