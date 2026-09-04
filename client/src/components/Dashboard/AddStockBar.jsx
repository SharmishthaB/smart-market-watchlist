import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Sparkles, AlertCircle, Check } from 'lucide-react';
import { api } from '../../api/client';

export function AddStockBar({ onAddStock, watchlistCount, maxLimit }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const dropdownRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const { results } = await api.searchStocks(query);
        setResults(results || []);
        setIsOpen(true);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = async (symbol) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await onAddStock(symbol);
      setSuccessMessage(`Added ${symbol} to your watchlist!`);
      setQuery('');
      setIsOpen(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to add stock');
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  const isAtCapacity = watchlistCount >= maxLimit;

  return (
    <div style={{ position: 'relative', marginBottom: '20px' }} ref={dropdownRef}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Search Input Box */}
        <div style={{
          position: 'relative',
          flex: 1,
          maxWidth: '560px'
        }}>
          <div style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }}>
            <Search size={16} />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setIsOpen(true)}
            placeholder="Search symbol or company (e.g. AAPL, NVDA, RELIANCE)..."
            disabled={isAtCapacity}
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(17, 24, 39, 0.7)',
              backdropFilter: 'blur(10px)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
            }}
            onFocusCapture={(e) => e.target.style.borderColor = 'var(--accent-green)'}
            onBlurCapture={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
          />

          {isSearching && (
            <div style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              Searching...
            </div>
          )}
        </div>

        {/* Watchlist Capacity Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Watchlist Limit
            </div>
            <div className="mono" style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: isAtCapacity ? 'var(--accent-red)' : 'var(--text-primary)'
            }}>
              {watchlistCount} <span style={{ color: 'var(--text-muted)' }}>/</span> {maxLimit}
            </div>
          </div>
          <div style={{
            width: '60px',
            height: '6px',
            borderRadius: '3px',
            background: 'rgba(255, 255, 255, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, (watchlistCount / maxLimit) * 100)}%`,
              height: '100%',
              background: isAtCapacity 
                ? 'var(--accent-red)' 
                : (watchlistCount / maxLimit > 0.8 ? 'var(--accent-amber)' : 'var(--accent-green)'),
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {errorMessage && (
        <div className="animate-slide-down" style={{
          marginTop: '10px',
          padding: '8px 14px',
          borderRadius: '8px',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: 'var(--accent-red)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={15} />
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="animate-slide-down" style={{
          marginTop: '10px',
          padding: '8px 14px',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--accent-green)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={15} />
          {successMessage}
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="glass-panel animate-slide-down" style={{
          position: 'absolute',
          top: '54px',
          left: 0,
          width: '560px',
          zIndex: 50,
          maxHeight: '320px',
          overflowY: 'auto',
          padding: '6px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)'
        }}>
          {results.map((stock) => (
            <div
              key={stock.symbol}
              onClick={() => handleAdd(stock.symbol)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  color: '#ffffff',
                  minWidth: '50px'
                }}>
                  {stock.symbol}
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {stock.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {stock.sector}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {stock.basePrice && (
                  <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    ${stock.basePrice.toFixed(2)}
                  </span>
                )}
                <button
                  className="btn btn-primary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                >
                  <Plus size={13} />
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
