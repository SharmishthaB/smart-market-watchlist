import React from 'react';

function formatVolume(val) {
  if (!val) return '0';
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toString();
}

export function VolumeBar({ volume, avgVolume }) {
  const current = Number(volume) || 0;
  const avg = Number(avgVolume) || 1;
  const ratio = current / avg;

  const isSurge = ratio >= 2.0;
  const isElevated = ratio >= 1.4 && ratio < 2.0;

  let barColor = 'rgba(255, 255, 255, 0.25)';
  let textColor = 'var(--text-muted)';

  if (isSurge) {
    barColor = 'var(--accent-amber)';
    textColor = 'var(--accent-amber)';
  } else if (isElevated) {
    barColor = 'var(--accent-cyan)';
    textColor = 'var(--accent-cyan)';
  }

  const fillPercent = Math.min(100, (ratio / 3.0) * 100);

  return (
    <div style={{ minWidth: '100px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        marginBottom: '3px'
      }}>
        <span className="mono" style={{ color: 'var(--text-secondary)' }}>
          {formatVolume(current)}
        </span>
        <span className="mono" style={{ fontWeight: 700, color: textColor }}>
          {ratio.toFixed(1)}x
        </span>
      </div>

      <div style={{
        width: '100%',
        height: '4px',
        borderRadius: '2px',
        background: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${fillPercent}%`,
          height: '100%',
          background: barColor,
          borderRadius: '2px',
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
}
