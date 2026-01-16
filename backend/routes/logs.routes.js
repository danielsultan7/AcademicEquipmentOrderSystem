const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// GET /api/logs - Get all logs with anomaly scores (admin only)
// Logs are created automatically by backend actions, not via API
// LEFT JOIN with log_anomaly_scores to include anomaly data
router.get('/', authenticate, requireAdmin, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);

  // Fetch logs with LEFT JOIN to anomaly scores
  const { data: logs, error } = await supabase
    .from('logs')
    .select(`
      *,
      log_anomaly_scores (
        anomaly_score,
        is_anomaly,
        model_name,
        analyzed_at
      )
    `)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('[GET /logs] Error:', error.message, error.code);
    return res.status(500).json({ error: error.message });
  }

  // Map database fields to frontend-friendly names
  // Include anomaly data (null if not yet analyzed)
  const result = logs.map(log => {
    // Supabase returns related data as object (single) or array (multiple)
    // For one-to-one relations, it's an object; handle both cases
    const anomalyData = Array.isArray(log.log_anomaly_scores) 
      ? log.log_anomaly_scores[0] 
      : log.log_anomaly_scores;
    
    return {
      id: log.id,
      userId: log.user_id,
      action: log.action,
      description: log.description,
      metadata: log.metadata,
      createdAt: log.timestamp,
      // Anomaly fields - null if not analyzed yet
      anomalyScore: anomalyData?.anomaly_score ?? null,
      isAnomaly: anomalyData?.is_anomaly ?? false,
      modelName: anomalyData?.model_name ?? null,
      analyzedAt: anomalyData?.analyzed_at ?? null
    };
  });

  console.log(`[GET /logs] Returning ${result.length} logs`);
  res.json(result);
});

module.exports = router;
