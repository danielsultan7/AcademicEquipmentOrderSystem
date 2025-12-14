const express = require('express');
const router = express.Router();
const { readData, writeData, getNextId } = require('../utils/fileDb');

const ORDERS_FILE = 'orders.json';
const PRODUCTS_FILE = 'products.json';

// GET /api/orders - Get all orders
router.get('/', (req, res) => {
  const orders = readData(ORDERS_FILE);
  res.json(orders);
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', (req, res) => {
  const orders = readData(ORDERS_FILE);
  const order = orders.find(o => o.id === parseInt(req.params.id));
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  res.json(order);
});

// POST /api/orders - Create new order
router.post('/', (req, res) => {
  const orders = readData(ORDERS_FILE);
  const products = readData(PRODUCTS_FILE);
  
  const orderItems = req.body.items || [];
  
  // Check stock availability
  for (const item of orderItems) {
    const product = products.find(p => p.id === item.productId);
    
    if (!product) {
      return res.status(400).json({ error: `Product ${item.productId} not found` });
    }
    
    if (product.quantity < item.quantity) {
      return res.status(400).json({ 
        error: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}` 
      });
    }
  }
  
  // Deduct quantities from products
  for (const item of orderItems) {
    const product = products.find(p => p.id === item.productId);
    product.quantity -= item.quantity;
    
    // Update status if out of stock
    if (product.quantity === 0) {
      product.status = 'unavailable';
    }
  }
  
  // Save updated products
  writeData(PRODUCTS_FILE, products);
  
  // Create the order
  const newOrder = {
    id: getNextId(orders),
    userId: req.body.userId,
    items: orderItems,
    status: 'pending',
    totalAmount: req.body.totalAmount || 0,
    createdAt: new Date().toISOString()
  };
  
  orders.push(newOrder);
  writeData(ORDERS_FILE, orders);
  
  res.status(201).json(newOrder);
});

// PUT /api/orders/:id - Update order
router.put('/:id', (req, res) => {
  const orders = readData(ORDERS_FILE);
  const index = orders.findIndex(o => o.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  orders[index] = {
    ...orders[index],
    status: req.body.status ?? orders[index].status,
    items: req.body.items ?? orders[index].items,
    totalAmount: req.body.totalAmount ?? orders[index].totalAmount
  };
  
  writeData(ORDERS_FILE, orders);
  res.json(orders[index]);
});

// PUT /api/orders/:id/approve - Approve order
router.put('/:id/approve', (req, res) => {
  const orders = readData(ORDERS_FILE);
  const index = orders.findIndex(o => o.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  orders[index].status = 'approved';
  orders[index].approvedAt = new Date().toISOString();
  
  writeData(ORDERS_FILE, orders);
  res.json(orders[index]);
});

// PUT /api/orders/:id/reject - Reject order (and restore stock)
router.put('/:id/reject', (req, res) => {
  const orders = readData(ORDERS_FILE);
  const products = readData(PRODUCTS_FILE);
  const index = orders.findIndex(o => o.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  const order = orders[index];
  
  // Restore stock if order was pending
  if (order.status === 'pending') {
    for (const item of order.items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        product.quantity += item.quantity;
        product.status = 'available';
      }
    }
    writeData(PRODUCTS_FILE, products);
  }
  
  orders[index].status = 'rejected';
  orders[index].rejectedAt = new Date().toISOString();
  
  writeData(ORDERS_FILE, orders);
  res.json(orders[index]);
});

// DELETE /api/orders/:id - Delete order (and restore stock if pending)
router.delete('/:id', (req, res) => {
  const orders = readData(ORDERS_FILE);
  const products = readData(PRODUCTS_FILE);
  const index = orders.findIndex(o => o.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  const order = orders[index];
  
  // Restore stock if order was pending
  if (order.status === 'pending') {
    for (const item of order.items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        product.quantity += item.quantity;
        product.status = 'available';
      }
    }
    writeData(PRODUCTS_FILE, products);
  }
  
  orders.splice(index, 1);
  writeData(ORDERS_FILE, orders);
  
  res.json({ message: 'Order deleted successfully' });
});

module.exports = router;
