import React, { useState, useEffect, useMemo } from 'react';
import { ordersApi, usersApi, productsApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { ROLE_ADMIN, ROLE_CUSTOMER, ROLE_PROCUREMENT_MANAGER } from '../constants/roles';

export default function Orders() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't fetch until auth is ready
    if (authLoading) {
      console.log('[Orders] Waiting for auth to load...');
      return;
    }
    
    if (!currentUser) {
      console.log('[Orders] No user logged in');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        console.log('[Orders] Loading data for user:', {
          id: currentUser.id,
          role: currentUser.role,
          token: localStorage.getItem('authToken') ? 'present' : 'MISSING'
        });
        
        // Customers don't have access to users list, so fetch conditionally
        const isAdmin = currentUser.role === ROLE_ADMIN || currentUser.role === ROLE_PROCUREMENT_MANAGER;
        
        const [ordersData, productsData] = await Promise.all([
          ordersApi.getAll(),
          productsApi.getAll()
        ]);
        
        // Only fetch users if admin/manager (they need it to display usernames)
        let usersData = [];
        if (isAdmin) {
          try {
            usersData = await usersApi.getAll();
          } catch (err) {
            console.warn('[Orders] Could not fetch users:', err.message);
          }
        }
        
        console.log('[Orders] Received orders:', ordersData.length, ordersData.map(o => ({ id: o.id, userId: o.userId, status: o.status })));
        setOrders(ordersData);
        setUsers(usersData);
        setProducts(productsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser, authLoading]);

  const getUserName = (userId) => {
    return users.find(u => u.id === userId)?.username || 'Unknown';
  };

  const getProductName = (productId) => {
    return products.find(p => p.id === productId)?.name || 'Unknown';
  };

  const visibleOrders = useMemo(() => {
    if (currentUser?.role === ROLE_CUSTOMER) {
      // Filter orders by customer ID - normalize both to numbers for comparison
      const filtered = orders.filter(o => Number(o.userId) === Number(currentUser.id));
      console.log('[Orders] Customer filter:', {
        customerId: currentUser.id,
        totalOrders: orders.length,
        matchingOrders: filtered.length,
        allOrderUserIds: orders.map(o => o.userId)
      });
      return filtered;
    }
    return orders;
  }, [orders, currentUser]);

  const approveOrder = async (orderId) => {
    try {
      await ordersApi.approve(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'approved' } : o));
    } catch (error) {
      console.error('Failed to approve order:', error);
      alert('Failed to approve order');
    }
  };

  const rejectOrder = async (orderId) => {
    try {
      await ordersApi.reject(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'rejected' } : o));
    } catch (error) {
      console.error('Failed to reject order:', error);
      alert('Failed to reject order');
    }
  };

  const canManage = currentUser?.role === ROLE_ADMIN || currentUser?.role === ROLE_PROCUREMENT_MANAGER;

  if (loading) {
    return <div className="loading-screen">Loading orders...</div>;
  }

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
