const express = require('express');
const router = express.Router();
const { readData, writeData, getNextId } = require('../utils/fileDb');

const FILENAME = 'logs.json';

// GET /api/logs - Get all logs
router.get('/', (req, res) => {
  const logs = readData(FILENAME);
  res.json(logs);
});

// POST /api/logs - Create new log entry
router.post('/', (req, res) => {
  const logs = readData(FILENAME);
  const newLog = {
    id: getNextId(logs),
    userId: req.body.userId,
    action: req.body.action,
    description: req.body.description || '',
    createdAt: new Date().toISOString()
  };
  
  logs.push(newLog);
  writeData(FILENAME, logs);
  
  res.status(201).json(newLog);
});

module.exports = router;
