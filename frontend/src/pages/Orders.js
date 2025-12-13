import React, { useState, useMemo } from 'react';
import { mockOrders, mockUsers, mockProducts } from '../data/mockData';
import { formatCurrency, formatDate } from '../utils';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { ROLE_ADMIN, ROLE_CUSTOMER, ROLE_PROCUREMENT_MANAGER } from '../constants/roles';

export default function Orders() {
  const { currentUser } = useAuth();
  const [localOrders, setLocalOrders] = useState(mockOrders);

  const getUserName = (userId) => {
    return mockUsers.find(u => u.id === userId)?.username || 'Unknown';
  };

  const getProductName = (productId) => {
    return mockProducts.find(p => p.id === productId)?.name || 'Unknown';
  };

  const visibleOrders = useMemo(() => {
    if (currentUser?.role === ROLE_CUSTOMER) {
      return localOrders.filter(o => o.userId === currentUser.id);
    }
    return localOrders;
  }, [localOrders, currentUser]);

  const approveOrder = (orderId) => {
    setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'approved' } : o));
  };

  const rejectOrder = (orderId) => {
    setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'rejected' } : o));
  };

  const canManage = currentUser?.role === ROLE_ADMIN || currentUser?.role === ROLE_PROCUREMENT_MANAGER;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Orders</h1>
            <p className="page-subtitle">{canManage ? 'Manage all procurement orders' : 'View your orders'}</p>
          </div>
          <ShoppingCart size={32} className="text-slate-400" />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                {canManage && <th>User</th>}
                <th>Items</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visibleOrders.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 5} className="text-center py-8 text-slate-600">
                    No orders found.
                  </td>
                </tr>
              ) : (
                visibleOrders.map(order => (
                  <tr key={order.id}>
                    <td className="font-semibold">#{order.id}</td>
                    {canManage && <td className="text-slate-600">{getUserName(order.userId)}</td>}
                    <td>
                      <div className="order-items-list">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="order-item-row">
                            {getProductName(item.productId)} x{item.quantity}
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <div className="order-item-more">+{order.items.length - 2} more</div>
                        )}
                      </div>
                    </td>
                    <td className="font-semibold">{formatCurrency(order.totalAmount)}</td>
                    <td className="text-slate-600">{formatDate(order.createdAt)}</td>
                    <td>
                      <span className={`badge ${
                        order.status === 'pending' ? 'badge-warning' :
                        order.status === 'approved' ? 'badge-success' :
                        order.status === 'rejected' ? 'badge-danger' : 'badge-info'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        {order.status === 'pending' && (
                          <div className="flex gap-2">
                            <button 
                              className="btn btn-outline btn-sm btn-success"
                              onClick={() => approveOrder(order.id)}
                            >
                              Approve
                            </button>
                            <button 
                              className="btn btn-outline btn-sm btn-danger"
                              onClick={() => rejectOrder(order.id)}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
