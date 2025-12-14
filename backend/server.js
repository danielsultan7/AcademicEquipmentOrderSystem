const express = require('express');
const cors = require('cors');

// Import routes
const usersRoutes = require('./routes/users.routes');
const productsRoutes = require('./routes/products.routes');
const ordersRoutes = require('./routes/orders.routes');
const logsRoutes = require('./routes/logs.routes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/logs', logsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📁 Data stored in JSON files at ./data/`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET    /api/health`);
  console.log(`  GET    /api/users`);
  console.log(`  GET    /api/products`);
  console.log(`  GET    /api/orders`);
  console.log(`  POST   /api/orders`);
  console.log(`  PUT    /api/orders/:id/approve`);
  console.log(`  PUT    /api/orders/:id/reject`);
  console.log(`  GET    /api/logs`);
  console.log(`  POST   /api/logs`);
});
