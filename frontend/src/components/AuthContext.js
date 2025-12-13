import React, { createContext, useState, useContext, useEffect } from 'react';
import { mockUsers } from '../data/mockData';
import { ROLE_CUSTOMER } from '../constants/roles';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading and set default user
    setTimeout(() => {
      // Default to customer role for demo
      const defaultUser = mockUsers.find(u => u.role === ROLE_CUSTOMER) || mockUsers[0];
      setCurrentUser(defaultUser);
      setIsLoading(false);
    }, 500);
  }, []);

  const login = (user) => {
    setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, users: mockUsers, isLoading }}>
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
