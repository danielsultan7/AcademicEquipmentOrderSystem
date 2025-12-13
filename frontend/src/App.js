import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './components/AuthContext';
import { RoleGuard } from './components/RoleGuard';
import { ROLE_ADMIN, ROLE_PROCUREMENT_MANAGER } from './constants/roles';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import Orders from './pages/Orders';
import ManageUsers from './pages/ManageUsers';
import ManageProducts from './pages/ManageProducts';
import Logs from './pages/Logs';
import Reports from './pages/Reports';

function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome to EduEquip</h1>
        <p className="page-subtitle">Academic Equipment Order System</p>
      </div>
      <div className="card">
        <div className="card-body p-8">
          <p className="text-slate-600">Select a section from the navigation menu to get started.</p>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RoleGuard><Home /></RoleGuard>} />
        <Route
          path="/dashboard"
          element={
            <RoleGuard allowedRoles={[ROLE_ADMIN, ROLE_PROCUREMENT_MANAGER]}>
              <Dashboard />
            </RoleGuard>
          }
        />
        <Route path="/catalog" element={<RoleGuard><Catalog /></RoleGuard>} />
        <Route path="/orders" element={<RoleGuard><Orders /></RoleGuard>} />
        <Route
          path="/users"
          element={
            <RoleGuard allowedRoles={[ROLE_ADMIN]}>
              <ManageUsers />
            </RoleGuard>
          }
        />
        <Route
          path="/manageproducts"
          element={
            <RoleGuard allowedRoles={[ROLE_ADMIN]}>
              <ManageProducts />
            </RoleGuard>
          }
        />
        <Route
          path="/logs"
          element={
            <RoleGuard allowedRoles={[ROLE_ADMIN]}>
              <Logs />
            </RoleGuard>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleGuard allowedRoles={[ROLE_ADMIN, ROLE_PROCUREMENT_MANAGER]}>
              <Reports />
            </RoleGuard>
          }
        />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
