import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pocketguard_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('pocketguard_token') || null;
  });
  const [loading, setLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await authService.getMe();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('pocketguard_user', JSON.stringify(res.data));
          } else {
            logout();
          }
        } catch (err) {
          console.error('Session validation error:', err);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (identifier, password) => {
    const res = await authService.login({ identifier, password });
    if (res.success && res.data) {
      setUser(res.data);
      setToken(res.data.token);
      localStorage.setItem('pocketguard_token', res.data.token);
      localStorage.setItem('pocketguard_user', JSON.stringify(res.data));
      return { success: true };
    }
    return { success: false, message: res.message || 'Login failed' };
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    if (res.success && res.data) {
      setUser(res.data);
      setToken(res.data.token);
      localStorage.setItem('pocketguard_token', res.data.token);
      localStorage.setItem('pocketguard_user', JSON.stringify(res.data));
      return { success: true };
    }
    return { success: false, message: res.message || 'Registration failed' };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pocketguard_token');
    localStorage.removeItem('pocketguard_user');
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await authService.getMe();
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('pocketguard_user', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const updateUserProfile = (newUserData) => {
    setUser((prev) => {
      const updated = { ...prev, ...newUserData };
      localStorage.setItem('pocketguard_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
