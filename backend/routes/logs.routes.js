const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// GET /api/logs - Get all logs (admin only)
// Logs are created automatically by backend actions, not via API
router.get('/', authenticate, requireAdmin, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);

  const { data: logs, error } = await supabase
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('[GET /logs] Error:', error.message, error.code);
    return res.status(500).json({ error: error.message });
  }

  // Map database fields to frontend-friendly names
  const result = logs.map(log => ({
    id: log.id,
    userId: log.user_id,
    action: log.action,
    description: log.description,
    metadata: log.metadata,
    createdAt: log.timestamp
  }));

  console.log(`[GET /logs] Returning ${result.length} logs`);
  res.json(result);
});

module.exports = router;
