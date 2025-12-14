import React, { createContext, useState, useContext, useEffect } from 'react';
import { usersApi } from '../services/api';
import { ROLE_CUSTOMER } from '../constants/roles';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch users from API and set default user
    const loadUsers = async () => {
      try {
        const fetchedUsers = await usersApi.getAll();
        setUsers(fetchedUsers);
        // Default to customer role for demo
        const defaultUser = fetchedUsers.find(u => u.role === ROLE_CUSTOMER) || fetchedUsers[0];
        setCurrentUser(defaultUser);
      } catch (error) {
        console.error('Failed to load users:', error);
        // Fallback to empty state if API fails
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  const login = (user) => {
    setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const refreshUsers = async () => {
    try {
      const fetchedUsers = await usersApi.getAll();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to refresh users:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, users, isLoading, refreshUsers }}>
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
