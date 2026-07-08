import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async (email, password) => {},
  register: async (fullName, email, password, role) => {},
  logout: () => {},
  hasRole: (allowedRoles) => false
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is cached in local storage
    const cachedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    
    if (cachedUser && token) {
      setUser(JSON.parse(cachedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/login', { email, password });
      
      const { accessToken, refreshToken, user: userData } = data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName, email, password, role) => {
    setLoading(true);
    try {
      const { data } = await api.post('/register', { fullName, email, password, role });
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.warn('[AuthContext] Logout request failed:', err);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasRole = (allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      register,
      logout,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
