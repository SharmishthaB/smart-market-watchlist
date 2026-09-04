import React from 'react';
import { AttentionBadge } from './AttentionBadge';
import { Sparkline } from './Sparkline';
import { VolumeBar } from './VolumeBar';
import { ArrowUpRight, ArrowDownRight, Trash2, ArrowUpDown, Info, Plus } from 'lucide-react';

export function WatchlistTable({
  items = [],
  sortBy,
  onSortChange,
  onRemoveStock,
  onSelectStock,
  onQuickAdd
}) {
  if (items.length === 0) {
    return (
      <div className="glass-panel" style={{
        padding: '60px 24px',
        textAlign: 'center',
        border: '1px dashed var(--border-subtle)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(16, 185, 129, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          <Info size={28} color="var(--accent-green)" />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
          Your Watchlist is Empty
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 24px auto' }}>
          Add market assets to begin real-time attention tracking, anomaly detection, and session-based delta digests.
        </p>

        {/* Quick Add Suggestions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Quick Add:</span>
          {['NVDA', 'AAPL', 'TSLA', 'RELIANCE', 'MSFT', 'INFY'].map((sym) => (
            <button
              key={sym}
              onClick={() => onQuickAdd(sym)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
            >
              <Plus size={13} color="var(--accent-green)" />
              {sym}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflow: 'hidden' }}>
      {/* Table Controls */}
      <div style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(255, 255, 255, 0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Tracked Assets ({items.length})
          </span>
        </div>

        {/* Sort selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
          <ArrowUpDown size={14} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-secondary)' }}>Sort by:</span>
          {[
            { id: 'attention', label: 'Attention Score (Default)' },
            { id: 'change', label: '24h % Move' },
            { id: 'custom', label: 'Added Order' }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => onSortChange(s.id)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: sortBy === s.id ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: sortBy === s.id ? 'var(--accent-green)' : 'var(--text-muted)',
                fontWeight: sortBy === s.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-subtle)',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)'
            }}>
              <th style={{ padding: '12px 18px', width: '190px' }}>Attention Priority</th>
              <th style={{ padding: '12px 18px' }}>Asset</th>
              <th style={{ padding: '12px 18px' }}>Price</th>
              <th style={{ padding: '12px 18px' }}>24h Return</th>
              <th style={{ padding: '12px 18px' }}>Volume Activity</th>
              <th style={{ padding: '12px 18px', textAlign: 'center' }}>7D Trend</th>
              <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((stock) => {
              const isPositive = (stock.changePct || 0) >= 0;
              const isUrgent = stock.urgency === 'urgent' || stock.attention_score >= 65;

              return (
                <tr
                  key={stock.symbol}
                  onClick={() => onSelectStock(stock.symbol)}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s ease',
                    cursor: 'pointer',
                    background: isUrgent ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isUrgent ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isUrgent ? 'rgba(239, 68, 68, 0.03)' : 'transparent'}
                >
                  {/* Attention Priority */}
                  <td style={{ padding: '14px 18px' }}>
                    <AttentionBadge
                      score={stock.attention_score}
                      urgency={stock.urgency}
                      headline={stock.headline}
                    />
                    {stock.headline && (
                      <div style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-secondary)',
                        marginTop: '4px',
                        maxWidth: '220px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {stock.headline}
                      </div>
                    )}
                  </td>

                  {/* Asset */}
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        color: '#ffffff'
                      }}>
                        {stock.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff' }}>
                          {stock.symbol}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {stock.name} · {stock.sector}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td style={{ padding: '14px 18px' }}>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                      ${stock.price?.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Prev: ${stock.prevClose?.toFixed(2) || '-'}
                    </div>
                  </td>

                  {/* 24h Return */}
                  <td style={{ padding: '14px 18px' }}>
                    <div className="mono" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      background: isPositive ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                      color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)'
                    }}>
                      {isPositive ? <ArrowUpRight size={13} strokeWidth={2.5} /> : <ArrowDownRight size={13} strokeWidth={2.5} />}
                      {isPositive ? '+' : ''}{stock.changePct?.toFixed(2)}%
                    </div>
                    <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {isPositive ? '+' : ''}${stock.change?.toFixed(2)}
                    </div>
                  </td>

                  {/* Volume Activity */}
                  <td style={{ padding: '14px 18px' }}>
                    <VolumeBar
                      volume={stock.volume}
                      avgVolume={stock.avgVolume}
                    />
                  </td>

                  {/* 7D Trend Sparkline */}
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-block' }}>
                      <Sparkline
                        data={stock.sparkline || []}
                        isPositive={isPositive}
                      />
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveStock(stock.symbol);
                      }}
                      className="btn"
                      style={{
                        padding: '6px',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        borderRadius: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--accent-red)';
                        e.currentTarget.style.background = 'var(--accent-red-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                      title={`Remove ${stock.symbol} from watchlist`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
