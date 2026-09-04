import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { RefreshCw, TrendingUp, Clock, LogOut, ShieldCheck } from 'lucide-react';

export function Header({ marketStatus, polling, onTakeSnapshot }) {
  const { user, logout } = useAuth();
  const isOpen = marketStatus?.isOpen;
  const secondsAgo = polling?.secondsAgo || 0;

  let freshnessColor = '#10b981'; // green
  if (secondsAgo > 45) freshnessColor = '#f59e0b'; // amber
  if (secondsAgo > 120) freshnessColor = '#f43f5e'; // red

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 28px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
        }}>
          <TrendingUp size={22} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              GROWW <span style={{ color: 'var(--accent-green)' }}>PULSE</span>
            </h1>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-green)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              Code 2026
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Smart Attention-Weighted Watchlist
          </p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Market Hours Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '20px',
          background: isOpen ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.12)',
          border: `1px solid ${isOpen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(100, 116, 139, 0.2)'}`,
          fontSize: '0.8rem',
          fontWeight: 600
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isOpen ? '#10b981' : '#94a3b8',
            boxShadow: isOpen ? '0 0 8px #10b981' : 'none'
          }} />
          <span style={{ color: isOpen ? '#10b981' : '#94a3b8' }}>
            {marketStatus?.statusText || 'Market Closed'}
          </span>
        </div>

        {/* Data Freshness Indicator */}
        <div 
          onClick={() => polling?.refreshNow()}
          title="Click to trigger instant market refresh"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
        >
          <Clock size={13} style={{ color: freshnessColor }} />
          <span>Updated <span className="mono" style={{ color: freshnessColor, fontWeight: 700 }}>{secondsAgo}s</span> ago</span>
          <RefreshCw 
            size={13} 
            className={polling?.isRefreshing ? 'animate-spin' : ''}
            style={{ 
              marginLeft: '2px', 
              color: 'var(--text-muted)',
              animation: polling?.isRefreshing ? 'spin 1s linear infinite' : 'none' 
            }} 
          />
        </div>
      </div>

      {/* User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onTakeSnapshot}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          title="Record manual baseline snapshot"
        >
          <ShieldCheck size={14} color="var(--accent-cyan)" />
          Save Baseline
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          paddingLeft: '12px',
          borderLeft: '1px solid var(--border-subtle)'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.email?.split('@')[0]}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {user?.email}
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ padding: '7px 10px', borderRadius: '8px' }}
            title="Sign Out"
          >
            <LogOut size={15} color="#f43f5e" />
          </button>
        </div>
      </div>
    </header>
  );
}
