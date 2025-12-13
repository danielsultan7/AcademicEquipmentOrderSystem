import React from 'react';
import { mockOrders, mockProducts } from '../data/mockData';
import { formatCurrency } from '../utils';
import { BarChart3, DollarSign, ShoppingCart, CheckCircle } from 'lucide-react';

export default function Reports() {
  // Calculate order statistics
  const orderStats = {
    total: mockOrders.length,
    pending: mockOrders.filter(o => o.status === 'pending').length,
    approved: mockOrders.filter(o => o.status === 'approved').length,
    rejected: mockOrders.filter(o => o.status === 'rejected').length
  };

  // Calculate total revenue
  const totalRevenue = mockOrders
    .filter(o => o.status === 'approved')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Calculate average order value
  const avgOrderValue = mockOrders.length > 0
    ? mockOrders.reduce((sum, o) => sum + o.totalAmount, 0) / mockOrders.length
    : 0;

  // Product popularity
  const productSales = {};
  mockOrders.forEach(order => {
    order.items.forEach(item => {
      productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
    });
  });

  const topProducts = Object.entries(productSales)
    .map(([productId, quantity]) => {
      const product = mockProducts.find(p => p.id === parseInt(productId));
      return { product, quantity };
    })
    .filter(item => item.product)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Calculate percentages
  const getPercentage = (value) => {
    return orderStats.total > 0 ? Math.round((value / orderStats.total) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Reports & Analytics</h1>
            <p className="page-subtitle">View system statistics and insights</p>
          </div>
          <BarChart3 size={32} className="text-slate-400" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-4">
        <div className="card stat-card">
          <div className="stat-card-content">
            <div>
              <p className="stat-label">Total Orders</p>
              <p className="stat-value">{orderStats.total}</p>
            </div>
            <ShoppingCart className="stat-icon" style={{ color: 'var(--color-primary)' }} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-card-content">
            <div>
              <p className="stat-label">Approved Orders</p>
              <p className="stat-value" style={{ color: 'var(--color-success)' }}>{orderStats.approved}</p>
            </div>
            <CheckCircle className="stat-icon" style={{ color: 'var(--color-success)' }} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-card-content">
            <div>
              <p className="stat-label">Total Revenue</p>
              <p className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>{formatCurrency(totalRevenue)}</p>
            </div>
            <DollarSign className="stat-icon" style={{ color: 'var(--color-primary)' }} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-card-content">
            <div>
              <p className="stat-label">Avg. Order Value</p>
              <p className="stat-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(avgOrderValue)}</p>
            </div>
            <BarChart3 className="stat-icon" style={{ color: 'var(--color-slate-400)' }} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-2">
        <div className="card">
          <div className="card-body">
            <h2 className="font-bold mb-4" style={{ fontSize: '1.125rem' }}>Order Status Distribution</h2>
            <div className="space-y-4">
              {/* Pending */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="role-dot" style={{ background: 'var(--color-warning)' }}></span>
                    <span>Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{orderStats.pending}</span>
                    <span className="text-slate-600">({getPercentage(orderStats.pending)}%)</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill progress-yellow"
                    style={{ width: `${getPercentage(orderStats.pending)}%` }}
                  ></div>
                </div>
              </div>

              {/* Approved */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="role-dot" style={{ background: 'var(--color-success)' }}></span>
                    <span>Approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{orderStats.approved}</span>
                    <span className="text-slate-600">({getPercentage(orderStats.approved)}%)</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill progress-green"
                    style={{ width: `${getPercentage(orderStats.approved)}%` }}
                  ></div>
                </div>
              </div>

              {/* Rejected */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="role-dot" style={{ background: 'var(--color-danger)' }}></span>
                    <span>Rejected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{orderStats.rejected}</span>
                    <span className="text-slate-600">({getPercentage(orderStats.rejected)}%)</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill progress-red"
                    style={{ width: `${getPercentage(orderStats.rejected)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 className="font-bold mb-4" style={{ fontSize: '1.125rem' }}>Top Products by Sales</h2>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((item, index) => {
                  const maxQty = Math.max(...topProducts.map(p => p.quantity));
                  return (
                    <div key={item.product.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">{index + 1}. {item.product.name}</span>
                        <span className="text-sm font-semibold text-primary">{item.quantity} units</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill progress-indigo"
                          style={{ width: `${(item.quantity / maxQty) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-state">No sales data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="card">
        <div className="card-body">
          <h2 className="font-bold mb-4" style={{ fontSize: '1.125rem' }}>Inventory Summary</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {mockProducts.map(product => (
                  <tr key={product.id}>
                    <td className="font-semibold">{product.name}</td>
                    <td className="text-slate-600">{product.category}</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>
                      <span className={product.quantity < 5 ? 'text-danger font-semibold' : ''}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="font-semibold text-primary">
                      {formatCurrency(product.price * product.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
