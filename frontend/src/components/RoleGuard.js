import React from 'react';
import { useAuth } from './AuthContext';

export function RoleGuard({ children, allowedRoles = [] }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="loading-screen">
        <div className="text-center">
          <h1 className="text-danger font-bold" style={{ fontSize: '1.5rem' }}>Authentication Required</h1>
          <p className="text-slate-600 mt-2">Please select a user to continue.</p>
        </div>
      </div>
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return (
      <div className="loading-screen">
        <div className="text-center">
          <h1 className="text-danger font-bold" style={{ fontSize: '1.5rem' }}>Access Denied</h1>
          <p className="text-slate-600 mt-2">You don't have permission to access this page.</p>
          <p className="text-slate-500 text-sm mt-1">Your role: {currentUser.role.replace(/_/g, ' ')}</p>
        </div>
      </div>
    );
  }

  return children;
}
