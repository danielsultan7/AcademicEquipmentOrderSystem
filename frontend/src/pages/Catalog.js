import React, { useState } from 'react';
import { mockProducts, mockOrders } from '../data/mockData';
import { formatCurrency } from '../utils';
import { useAuth } from '../components/AuthContext';
import { ROLE_CUSTOMER } from '../constants/roles';
import { ShoppingBag, X, Plus, Minus } from 'lucide-react';

export default function Catalog() {
  const { currentUser } = useAuth();
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const canOrder = currentUser?.role === ROLE_CUSTOMER;

  const addToCart = (product) => {
    if (!canOrder) return;
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, product.quantity) }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      const product = mockProducts.find(p => p.id === productId);
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, quantity: Math.min(quantity, product.quantity) }
          : item
      ));
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (!canOrder) {
      alert('Only customers can place orders.');
      return;
    }
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    // Create order from cart items
    const newOrder = {
      id: Math.max(...mockOrders.map(o => parseInt(o.id)), 0) + 1,
      userId: currentUser.id,
      status: 'pending',
      items: cart.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity
      })),
      totalAmount: cartTotal,
      createdDate: new Date().toISOString(),
      approvedDate: null,
      rejectionReason: null
    };

    mockOrders.push(newOrder);
    setCart([]);
    setShowCart(false);
    alert('Order placed successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Equipment Catalog</h1>
            <p className="page-subtitle">Browse and order academic equipment</p>
          </div>
          {canOrder && (
            <button
              onClick={() => setShowCart(!showCart)}
              className="cart-toggle"
            >
              <ShoppingBag />
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount}</span>
              )}
            </button>
          )}
        </div>
      </div>

      {canOrder && showCart && (
        <div className="card cart-panel">
          <div className="card-body">
            <div className="cart-header">
              <h2 className="font-bold" style={{ fontSize: '1.25rem' }}>Shopping Cart</h2>
              <button onClick={() => setShowCart(false)} className="btn btn-ghost btn-icon">
                <X size={20} />
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="empty-state">Your cart is empty</p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-info">
                        <p className="cart-item-name">{item.name}</p>
                        <p className="cart-item-price">{formatCurrency(item.price)} each</p>
                      </div>
                      <div className="cart-item-controls">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="btn btn-ghost btn-icon btn-sm"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="cart-item-qty">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="btn btn-ghost btn-icon btn-sm"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <p className="cart-item-total">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="btn btn-ghost btn-icon btn-sm btn-danger"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cart-total">
                  <span className="cart-total-label">Total:</span>
                  <span className="cart-total-value">{formatCurrency(cartTotal)}</span>
                </div>
                <button onClick={handleCheckout} className="btn btn-primary w-full">
                  Checkout
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="product-grid">
        {mockProducts.map(product => (
          <div key={product.id} className="card product-card">
            <div className="product-image">
              <ShoppingBag />
            </div>
            <div className="product-info">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-description">{product.description}</p>
              <p className="product-category">Category: {product.category}</p>

              <div className="product-footer">
                <div>
                  <p className="product-price">{formatCurrency(product.price)}</p>
                  <p className="product-stock">
                    Stock: <span className={product.quantity > 0 ? 'stock-available' : 'stock-out'}>
                      {product.quantity}
                    </span>
                  </p>
                </div>
              </div>

              <button 
                onClick={() => addToCart(product)}
                disabled={!canOrder || product.quantity === 0}
                className="btn btn-primary w-full mt-4"
              >
                {!canOrder
                  ? 'Customers can order'
                  : product.quantity > 0
                    ? 'Add to Cart'
                    : 'Out of Stock'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
