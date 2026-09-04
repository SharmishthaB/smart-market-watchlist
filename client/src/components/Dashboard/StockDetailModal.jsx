import React from 'react';
import { X, Flame, BarChart3, TrendingUp, Compass, CheckCircle2, AlertCircle } from 'lucide-react';
import { Sparkline } from './Sparkline';

export function StockDetailModal({ stock, onClose }) {
  if (!stock) return null;

  const signals = stock.signals || {};
  const { priceMove, volume, levelBreak, sectorDivergence } = signals;
  const isPositive = (stock.changePct || 0) >= 0;

  // 52-Week Range Position percentage
  const low52 = stock.week52Low || (stock.price * 0.8);
  const high52 = stock.week52High || (stock.price * 1.2);
  const range52 = high52 - low52 || 1;
  const current52Pos = Math.max(0, Math.min(100, ((stock.price - low52) / range52) * 100));

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 15, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}
    onClick={onClose}
    >
      <div 
        className="glass-panel animate-slide-down"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                {stock.symbol}
              </h2>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {stock.name}
              </span>
              <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
                {stock.sector}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '6px' }}>
              <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
                ${stock.price?.toFixed(2)}
              </span>
              <span className="mono" style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)'
              }}>
                {isPositive ? '+' : ''}{stock.changePct?.toFixed(2)}% ({isPositive ? '+' : ''}${stock.change?.toFixed(2)})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Attention Score Hero Card */}
        <div style={{
          padding: '18px 20px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.12) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Flame size={18} color="var(--accent-amber)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-amber)' }}>
                Attention Engine Verdict
              </span>
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff' }}>
              {stock.headline || 'Routine trading action within normal volatility parameters.'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Evaluated using multi-factor econometric model (Volatility Z-Score, Volume surge, Breakouts, Sector alpha)
            </div>
          </div>

          <div style={{ textAlign: 'center', minWidth: '90px' }}>
            <div className="mono" style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color: stock.badgeColor || 'var(--text-primary)',
              lineHeight: 1
            }}>
              {stock.attention_score}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
              / 100 Score
            </div>
          </div>
        </div>

        {/* 4 Quantitative Breakdown Cards */}
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Quantitative Signal Attribution
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {/* Signal 1: Price Volatility */}
          <div style={{
            padding: '14px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                1. Relative Volatility
              </span>
              <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                {priceMove?.weightedPoints || 0} / 35 pts
              </span>
            </div>
            <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Z-Score: {priceMove?.rawZScore || 0}σ
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {priceMove?.explanation}
            </p>
          </div>

          {/* Signal 2: Volume Anomaly */}
          <div style={{
            padding: '14px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                2. Volume Anomaly
              </span>
              <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                {volume?.weightedPoints || 0} / 25 pts
              </span>
            </div>
            <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Ratio: {volume?.ratio || 1.0}x
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {volume?.explanation}
            </p>
          </div>

          {/* Signal 3: Level Breaks */}
          <div style={{
            padding: '14px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                3. Milestone Breaks
              </span>
              <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {levelBreak?.weightedPoints || 0} / 25 pts
              </span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              {levelBreak?.breaks?.length ? `${levelBreak.breaks.length} Critical Levels` : 'In Range'}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {levelBreak?.explanation}
            </p>
          </div>

          {/* Signal 4: Sector Divergence */}
          <div style={{
            padding: '14px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                4. Sector Alpha
              </span>
              <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                {sectorDivergence?.weightedPoints || 0} / 15 pts
              </span>
            </div>
            <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Δ {sectorDivergence?.divergence || 0}%
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {sectorDivergence?.explanation}
            </p>
          </div>
        </div>

        {/* 52-Week Range Bar */}
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span>52W Low: <strong className="mono" style={{ color: 'var(--text-primary)' }}>${low52.toFixed(2)}</strong></span>
            <span style={{ fontWeight: 600 }}>52-Week Price Spectrum</span>
            <span>52W High: <strong className="mono" style={{ color: 'var(--text-primary)' }}>${high52.toFixed(2)}</strong></span>
          </div>

          <div style={{ position: 'relative', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' }}>
            <div style={{
              position: 'absolute',
              left: `${current52Pos}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'var(--accent-green)',
              boxShadow: '0 0 10px var(--accent-green)'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Day Low: ${stock.dayLow?.toFixed(2) || '-'}</span>
            <span>Day High: ${stock.dayHigh?.toFixed(2) || '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
