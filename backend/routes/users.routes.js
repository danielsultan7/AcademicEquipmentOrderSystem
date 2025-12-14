const express = require('express');
const router = express.Router();
const { readData, writeData, getNextId } = require('../utils/fileDb');

const FILENAME = 'users.json';

// GET /api/users - Get all users
router.get('/', (req, res) => {
  const users = readData(FILENAME);
  // Return users without passwords for security
  const safeUsers = users.map(({ password, ...user }) => user);
  res.json(safeUsers);
});

// GET /api/users/:id - Get user by ID
router.get('/:id', (req, res) => {
  const users = readData(FILENAME);
  const user = users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

// POST /api/users - Create new user
router.post('/', (req, res) => {
  const users = readData(FILENAME);
  const newUser = {
    id: getNextId(users),
    username: req.body.username,
    password: req.body.password || 'default123',
    role: req.body.role || 'customer'
  };
  
  users.push(newUser);
  writeData(FILENAME, users);
  
  const { password, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

// PUT /api/users/:id - Update user
router.put('/:id', (req, res) => {
  const users = readData(FILENAME);
  const index = users.findIndex(u => u.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  users[index] = {
    ...users[index],
    username: req.body.username ?? users[index].username,
    role: req.body.role ?? users[index].role,
    password: req.body.password ?? users[index].password
  };
  
  writeData(FILENAME, users);
  
  const { password, ...safeUser } = users[index];
  res.json(safeUser);
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', (req, res) => {
  const users = readData(FILENAME);
  const index = users.findIndex(u => u.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const deleted = users.splice(index, 1)[0];
  writeData(FILENAME, users);
  
  const { password, ...safeUser } = deleted;
  res.json(safeUser);
});

module.exports = router;
