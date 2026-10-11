import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check current session by calling GET /api/auth/me
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setError(null);
      return res.data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    // Listen for session expiration events dispatched by Axios interceptor
    const handleSessionExpired = () => {
      setUser(null);
    };

    window.addEventListener('securecloud:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('securecloud:session-expired', handleSessionExpired);
    };
  }, [refreshUser]);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/register', { email, password });
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout request warning:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: Boolean(user)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
