import React, { useState, useEffect } from 'react';
import { productsApi, ordersApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils';
import { TrendingUp, Package, ShoppingCart, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, ordersData] = await Promise.all([
          productsApi.getAll(),
          ordersApi.getAll()
        ]);
        setProducts(productsData);
        setOrders(ordersData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const totalProducts = products.length;
  const totalOrders = orders.length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const lowStockItems = products.filter(p => p.quantity < 5).length;

  if (loading) {
    return <div className="loading-screen">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome to EduEquip Procurement System</p>
      </div>

      <div className="grid grid-4">
        <div className="card stat-card">
          <div className="stat-card-content">
            <div>
              <p className="stat-label">Total Products</p>
              <p className="stat-value">{totalProducts}</p>
            </div>
            <Package className="stat-icon" style={{ color: 'var(--color-primary)' }} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-card-content">
            <div>
              <p className="stat-label">Total Orders</p>
              <p className="stat-value">{totalOrders}</p>
            </div>
            <ShoppingCart className="stat-icon" style={{ color: 'var(--color-info)' }} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-card-content">
            <div>
              <p className="stat-label">Inventory Value</p>
              <p className="stat-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(totalValue)}</p>
            </div>
            <TrendingUp className="stat-icon" style={{ color: 'var(--color-success)' }} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-card-content">
            <div>
              <p className="stat-label">Low Stock Items</p>
              <p className="stat-value">{lowStockItems}</p>
            </div>
            <AlertCircle className="stat-icon" style={{ color: 'var(--color-warning)' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-body">
            <h2 className="font-bold mb-4" style={{ fontSize: '1.125rem' }}>Recent Orders</h2>
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded" style={{ background: 'var(--color-slate-50)' }}>
                  <div>
                    <p className="font-semibold">Order #{order.id}</p>
                    <p className="text-xs text-slate-600">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className={`badge ${
                    order.status === 'pending' ? 'badge-warning' :
                    order.status === 'approved' ? 'badge-success' :
                    order.status === 'rejected' ? 'badge-danger' : 'badge-info'
                  }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 className="font-bold mb-4" style={{ fontSize: '1.125rem' }}>Top Products</h2>
            <div className="space-y-3">
              {products.slice(0, 5).map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded" style={{ background: 'var(--color-slate-50)' }}>
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-xs text-slate-600">Stock: {product.quantity}</p>
                  </div>
                  <p className="font-semibold text-primary">{formatCurrency(product.price)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
