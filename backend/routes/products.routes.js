const express = require('express');
const router = express.Router();
const { readData, writeData, getNextId } = require('../utils/fileDb');

const FILENAME = 'products.json';

// GET /api/products - Get all products
router.get('/', (req, res) => {
  const products = readData(FILENAME);
  res.json(products);
});

// GET /api/products/:id - Get product by ID
router.get('/:id', (req, res) => {
  const products = readData(FILENAME);
  const product = products.find(p => p.id === parseInt(req.params.id));
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json(product);
});

// POST /api/products - Create new product
router.post('/', (req, res) => {
  const products = readData(FILENAME);
  const newProduct = {
    id: getNextId(products),
    name: req.body.name,
    description: req.body.description || '',
    price: parseFloat(req.body.price) || 0,
    quantity: parseInt(req.body.quantity) || 0,
    category: req.body.category || 'Uncategorized',
    status: req.body.quantity > 0 ? 'available' : 'unavailable'
  };
  
  products.push(newProduct);
  writeData(FILENAME, products);
  
  res.status(201).json(newProduct);
});

// PUT /api/products/:id - Update product
router.put('/:id', (req, res) => {
  const products = readData(FILENAME);
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const quantity = req.body.quantity !== undefined 
    ? parseInt(req.body.quantity) 
    : products[index].quantity;
  
  products[index] = {
    ...products[index],
    name: req.body.name ?? products[index].name,
    description: req.body.description ?? products[index].description,
    price: req.body.price !== undefined ? parseFloat(req.body.price) : products[index].price,
    quantity: quantity,
    category: req.body.category ?? products[index].category,
    status: quantity > 0 ? 'available' : 'unavailable'
  };
  
  writeData(FILENAME, products);
  res.json(products[index]);
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', (req, res) => {
  const products = readData(FILENAME);
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const deleted = products.splice(index, 1)[0];
  writeData(FILENAME, products);
  
  res.json(deleted);
});

module.exports = router;
