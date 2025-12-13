import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROLE_ADMIN, ROLE_CUSTOMER, ROLE_PROCUREMENT_MANAGER } from '../constants/roles';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ShoppingCart, 
  Users, 
  Package, 
  FileText, 
  Activity,
  LogOut,
  Menu,
  X
} from 'lucide-react';

function NavItem({ icon: Icon, label, path, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`nav-item ${active ? 'active' : ''}`}
    >
      <Icon />
      {label}
    </button>
  );
}

function LayoutContent({ children }) {
  const { currentUser, users, login, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="loading-screen">Loading system...</div>;
  }

  // Define available routes based on role
  const getNavItems = () => {
    if (!currentUser) return [];
    
    const items = [{ label: 'Catalog', icon: ShoppingBag, path: '/catalog' }];

    if (currentUser.role === ROLE_CUSTOMER) {
      items.push({ label: 'My Orders', icon: ShoppingCart, path: '/orders' });
    }

    if (currentUser.role === ROLE_PROCUREMENT_MANAGER || currentUser.role === ROLE_ADMIN) {
      items.unshift({ label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' });
      items.push({ label: 'All Orders', icon: ShoppingCart, path: '/orders' });
      items.push({ label: 'Reports', icon: FileText, path: '/reports' });
    }

    if (currentUser.role === ROLE_ADMIN) {
      items.push({ label: 'Manage Users', icon: Users, path: '/users' });
      items.push({ label: 'Manage Products', icon: Package, path: '/manageproducts' });
      items.push({ label: 'System Logs', icon: Activity, path: '/logs' });
    }

    return items;
  };

  const navItems = getNavItems();

  const getRoleClass = (role) => {
    if (role === ROLE_ADMIN) return 'role-admin';
    if (role === ROLE_PROCUREMENT_MANAGER) return 'role-manager';
    return 'role-customer';
  };

  return (
    <div className="app-layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Package size={20} />
            </div>
            EduEquip
          </div>
          <div className="sidebar-subtitle">Procurement System</div>
        </div>

        <div className="session-panel">
          <div className="session-card">
            <p className="session-label">Current Session</p>
            <div className="session-info">
              <div>
                <p className="session-username">
                  {currentUser?.username || 'Guest'}
                </p>
                <p className="session-role">
                  {currentUser?.role?.replace('_', ' ') || 'No Role'}
                </p>
              </div>
              
              <div className="dropdown">
                <button 
                  className="btn btn-ghost btn-icon"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <LogOut size={16} />
                </button>
                
                {isDropdownOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-label">Switch User (Demo Mode)</div>
                    <div className="dropdown-separator" />
                    {users.map(u => (
                      <button
                        key={u.id}
                        className="dropdown-item"
                        onClick={() => {
                          login(u);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <span className={`role-dot ${getRoleClass(u.role)}`}></span>
                        <div style={{ flex: 1 }}>
                          <div>{u.username}</div>
                          <div className="text-xs text-slate-400 capitalize">{u.role.replace('_', ' ')}</div>
                        </div>
                        {currentUser?.id === u.id && <span className="text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavItem 
              key={item.label} 
              {...item}
              active={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Package size={16} />
          </div>
          EduEquip
        </div>
        <button 
          className="btn btn-ghost btn-icon"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div className="overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="sheet">
            <div className="sheet-header flex items-center justify-between">
              <span>Menu</span>
              <button 
                className="btn btn-ghost btn-icon"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavItem 
                  key={item.label}
                  {...item}
                  active={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                />
              ))}
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="main-content">
        <div className="content-container">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <LayoutContent>
      {children}
    </LayoutContent>
  );
}
