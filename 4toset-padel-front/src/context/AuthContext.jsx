import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, onUnauthorized } from '../api/client.js';
import { SESSION_EXPIRED_MESSAGE } from '../utils/errors.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const payload = await api.get('/api/users/me', { suppressUnauthorized: true });
      setUser(payload.data);
      setStatus('authenticated');
      setMessage('');
    } catch {
      setUser(null);
      setStatus('anonymous');
      setMessage('');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        setStatus('anonymous');
        setMessage(SESSION_EXPIRED_MESSAGE);
        navigate('/login', { replace: true });
      }),
    [navigate],
  );

  const login = useCallback(async (credentials) => {
    const payload = await api.post('/api/auth/login', credentials);
    setUser(payload.data);
    setStatus('authenticated');
    setMessage('');
    return payload.data;
  }, []);

  const register = useCallback(async (data) => {
    const payload = await api.post('/api/auth/register', data);
    setUser(payload.data);
    setStatus('authenticated');
    setMessage('');
    return payload.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
      setStatus('anonymous');
      setMessage('');
    }
  }, []);

  const updateMe = useCallback(async (changes) => {
    const payload = await api.patch('/api/users/me', changes);
    setUser(payload.data);
    return payload.data;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      message,
      isAdmin: user?.rol === 'administrador',
      isPlayer: user?.rol === 'jugador',
      refresh,
      login,
      register,
      logout,
      updateMe,
    }),
    [user, status, message, refresh, login, register, logout, updateMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
