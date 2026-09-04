import React from 'react';
import { Flame, AlertTriangle, Minus } from 'lucide-react';

export function AttentionBadge({ score, urgency, headline }) {
  const isUrgent = urgency === 'urgent' || score >= 65;
  const isNotable = urgency === 'notable' || (score >= 35 && score < 65);

  let badgeClass = 'badge-minor';
  let Icon = Minus;
  let label = 'Quiet';

  if (isUrgent) {
    badgeClass = 'badge-urgent';
    Icon = Flame;
    label = 'Urgent Action';
  } else if (isNotable) {
    badgeClass = 'badge-notable';
    Icon = AlertTriangle;
    label = 'Notable Shift';
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
      <div 
        className={`badge ${badgeClass} ${isUrgent ? 'animate-pulse-glow' : ''}`}
        title={headline || `Attention score: ${score}/100`}
        style={{
          cursor: 'help',
          boxShadow: isUrgent ? 'var(--urgent-glow)' : (isNotable ? 'var(--notable-glow)' : 'none')
        }}
      >
        <Icon size={12} strokeWidth={2.5} />
        <span className="mono" style={{ fontWeight: 800 }}>{score}</span>
        <span style={{ opacity: 0.85, fontWeight: 500, fontSize: '0.68rem' }}>· {label}</span>
      </div>
    </div>
  );
}
