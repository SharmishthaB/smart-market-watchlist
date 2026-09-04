import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('groww_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('groww_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const { user: profile } = await api.getMe();
        setUser(profile);
      } catch (err) {
        console.warn('Session expired or invalid:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('groww_token', res.token);
    localStorage.setItem('groww_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const register = async (email, password) => {
    const res = await api.register(email, password);
    localStorage.setItem('groww_token', res.token);
    localStorage.setItem('groww_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('groww_token');
    localStorage.removeItem('groww_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: Boolean(token) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
