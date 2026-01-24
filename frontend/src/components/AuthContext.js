import React, { createContext, useState, useContext, useEffect } from 'react';
import { usersApi, authApi } from '../services/api';

const AuthContext = createContext();

// Key for storing user in localStorage
const STORAGE_KEY = 'currentUser';
const TOKEN_KEY = 'authToken';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const loadSession = () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEY);
        const token = localStorage.getItem(TOKEN_KEY);
        
        // Only restore session if both user data and token exist
        if (storedUser && token) {
          const user = JSON.parse(storedUser);
          // Ensure ID is a number for consistent comparison with backend data
          setCurrentUser({
            id: Number(user.id),
            username: user.username,
            role: user.role
          });
        } else {
          // Clear any partial data
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = (user) => {
    // Store only id, username, and role
    // Ensure ID is a number for consistent comparison
    const safeUser = {
      id: Number(user.id),
      username: user.username,
      role: user.role
    };
    setCurrentUser(safeUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
    // Note: Token is stored by authApi.login()
  };

  const logout = async (reason = 'manual') => {
    // Call API to log the logout action (this must happen BEFORE clearing token)
    await authApi.logout(reason);
    setCurrentUser(null);
  };

  const refreshUsers = async () => {
    // This function is kept for backward compatibility with ManageUsers page
    try {
      await usersApi.getAll();
    } catch (error) {
      console.error('Failed to refresh users:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isLoading, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
