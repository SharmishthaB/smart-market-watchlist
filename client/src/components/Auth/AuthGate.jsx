import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Shield, Sparkles, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export function AuthGate() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click demo login for evaluators
  const handleQuickDemo = async () => {
    setError('');
    setLoading(true);
    try {
      const demoEmail = 'judge@groww.in';
      const demoPass = 'groww2026';
      try {
        await login(demoEmail, demoPass);
      } catch (loginErr) {
        // If not yet registered, register automatically!
        await register(demoEmail, demoPass);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      <div className="glass-panel animate-slide-down" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '36px 32px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        background: 'rgba(15, 23, 42, 0.85)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
          }}>
            <TrendingUp size={28} color="#ffffff" strokeWidth={2.5} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Groww <span style={{ color: 'var(--accent-green)' }}>Pulse</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Smart Market Watchlist with Attention Intelligence
          </p>
        </div>

        {/* Evaluator Quick Demo Bar */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '10px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-green)' }}>
              <Zap size={14} />
              Quick Evaluator Demo
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              1-click test session with preloaded data
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
          >
            Launch Demo
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              borderBottom: !isRegister ? '2px solid var(--accent-green)' : '2px solid transparent',
              color: !isRegister ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              borderBottom: isRegister ? '2px solid var(--accent-green)' : '2px solid transparent',
              color: isRegister ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'var(--accent-red-bg)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: 'var(--accent-red)',
            fontSize: '0.8rem',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trader@groww.in"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '0.9rem' }}
          >
            {loading ? 'Processing...' : (isRegister ? 'Register & Begin Tracking' : 'Sign In')}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          State persists across all devices · Free API rate-limited batch architecture
        </div>
      </div>
    </div>
  );
}
