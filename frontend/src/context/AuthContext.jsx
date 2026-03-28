import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.me()
        .then(({ data }) => setUser(data.data.user))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('refresh_token', data.data.refreshToken);
    setUser(data.data.user);
    return data.data;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authApi.register(formData);
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('refresh_token', data.data.refreshToken);
    setUser(data.data.user);
    return data.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  const setTokens = useCallback((token, refreshToken) => {
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    authApi.me()
      .then(({ data }) => setUser(data.data.user))
      .catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, setTokens }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
