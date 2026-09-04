import React, { useState } from 'react';
import { BellRing, ChevronDown, ChevronUp, CheckCheck, ArrowUpRight, ArrowDownRight, Sparkles, Activity } from 'lucide-react';

export function DigestCard({ digest, onDismiss, onSelectStock }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!digest || !digest.hasDigest || !digest.changes || digest.changes.length === 0) {
    return null;
  }

  const { summary, timeAwayText, changes } = digest;
  const urgentChanges = changes.filter(c => c.urgency === 'urgent');
  const notableChanges = changes.filter(c => c.urgency === 'notable');

  return (
    <div className="glass-panel animate-slide-down" style={{
      marginBottom: '24px',
      overflow: 'hidden',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(17, 24, 39, 0.9) 100%)'
    }}>
      {/* Header Bar */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
        cursor: 'pointer'
      }}
      onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
          }}>
            <BellRing size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                While You Were Away
              </h2>
              <span className="badge badge-notable" style={{ fontSize: '0.7rem' }}>
                <Sparkles size={11} />
                Away {timeAwayText}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {urgentChanges.length > 0 
                ? `${urgentChanges.length} stock${urgentChanges.length === 1 ? '' : 's'} had urgent structural changes since your last session`
                : 'Notable price and volatility movements detected since your last visit'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
          {/* Quick Badges */}
          {summary.urgentCount > 0 && (
            <span className="badge badge-urgent">
              🔴 {summary.urgentCount} Urgent
            </span>
          )}
          {summary.notableCount > 0 && (
            <span className="badge badge-notable">
              🟡 {summary.notableCount} Notable
            </span>
          )}

          <button
            onClick={onDismiss}
            className="btn btn-primary"
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            }}
            title="Mark as reviewed and reset baseline snapshot"
          >
            <CheckCheck size={14} />
            Got It (Set Baseline)
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-secondary"
            style={{ padding: '6px 8px', borderRadius: '8px' }}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Digest Content */}
      {isExpanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {changes.slice(0, 6).map((change) => {
            const isPositive = change.priceDeltaPct >= 0;
            const isUrgent = change.urgency === 'urgent';
            const isNotable = change.urgency === 'notable';

            let borderColor = 'rgba(255, 255, 255, 0.08)';
            if (isUrgent) borderColor = 'rgba(239, 68, 68, 0.4)';
            else if (isNotable) borderColor = 'rgba(245, 158, 11, 0.3)';

            return (
              <div
                key={change.symbol}
                onClick={() => onSelectStock && onSelectStock(change.symbol)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: isUrgent ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Left info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    color: isUrgent ? '#ef4444' : 'var(--text-primary)'
                  }}>
                    {change.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                        {change.symbol}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {change.name}
                      </span>
                      {change.badges?.map((badge, idx) => (
                        <span key={idx} className={`badge ${isUrgent ? 'badge-urgent' : isNotable ? 'badge-notable' : 'badge-minor'}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          {badge}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {change.reason}
                    </div>
                  </div>
                </div>

                {/* Right stats */}
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {/* Score Delta */}
                  {change.scoreDelta !== 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Attention Shift</div>
                      <div className="mono" style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: change.scoreDelta > 0 ? 'var(--accent-amber)' : 'var(--text-muted)'
                      }}>
                        {change.scoreDelta > 0 ? `+${change.scoreDelta}` : change.scoreDelta} pts
                      </div>
                    </div>
                  )}

                  {/* Price Delta */}
                  <div>
                    <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                      ${change.currentPrice?.toFixed(2)}
                    </div>
                    <div className="mono" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '2px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)'
                    }}>
                      {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {isPositive ? '+' : ''}{change.priceDeltaPct?.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
