import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { authApi } from '../services/api';
import { Package, LogIn } from 'lucide-react';
import { ROLE_ADMIN, ROLE_PROCUREMENT_MANAGER } from '../constants/roles';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * Get the default redirect path based on user role
   */
  const getDefaultPathForRole = (role) => {
    switch (role) {
      case ROLE_ADMIN:
      case ROLE_PROCUREMENT_MANAGER:
        return '/dashboard';
      default:
        return '/catalog';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.login(username, password);
      
      // Store only id, username, and role in currentUser
      // Ensure ID is stored as a number for consistent comparison
      const currentUser = {
        id: Number(response.user.id),
        username: response.user.username,
        role: response.user.role
      };
      
      login(currentUser);
      
      // Redirect based on role
      const redirectPath = getDefaultPathForRole(currentUser.role);
      navigate(redirectPath);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <div className="login-logo-icon">
              <Package size={32} />
            </div>
          </div>
          <h1 className="login-title">EduEquip</h1>
          <p className="login-subtitle">Academic Equipment Order System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="Enter your username"
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              'Signing in...'
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
