/**
 * Integration Example: Audit Logger + Anomaly Detection
 * ======================================================
 * 
 * This file shows how to integrate the anomaly detection queue
 * with your existing audit logger. 
 * 
 * MINIMAL CHANGES REQUIRED:
 * Only 2 lines need to be added to auditLogger.js
 */

// =============================================================================
// OPTION 1: Add to existing auditLogger.js (Recommended)
// =============================================================================

/*
Add these 2 lines to backend/utils/auditLogger.js:

1. At the top (with other imports):
   const { queueLogForAnalysis } = require('../services/anomalyProcessor');

2. After successful database insert (after line ~118):
   // Queue for anomaly detection (non-blocking)
   queueLogForAnalysis({
     id: data.id,
     action: actionType,
     description,
     metadata
   });
*/

// =============================================================================
// OPTION 2: Full modified logAuditAction function (copy-paste ready)
// =============================================================================

const { supabase } = require('./supabaseClient');
const { queueLogForAnalysis } = require('../services/anomalyProcessor');

async function logAuditAction({ userId, actionType, description, metadata = null }) {
  // ... existing validation code (unchanged) ...
  
  try {
    const { data, error } = await supabase
      .from('logs')
      .insert({
        user_id: userId,
        action: actionType,
        description: description.trim(),
        metadata: metadata,
        timestamp: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('[AuditLogger] Database error:', error.message);
      return { success: false, error: error.message };
    }

    // =====================================================
    // NEW: Queue for anomaly detection (non-blocking)
    // This does NOT block the audit log write
    // =====================================================
    queueLogForAnalysis({
      id: data.id,
      action: actionType,
      description,
      metadata
    });

    return { success: true, logId: data?.id };
    
  } catch (err) {
    console.error('[AuditLogger] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// OPTION 3: Start processor in server.js
// =============================================================================

/*
Add to backend/server.js after app.listen():

const { startProcessor } = require('./services/anomalyProcessor');

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  
  // Start anomaly detection background processor
  startProcessor();
});
*/

module.exports = { logAuditAction };
