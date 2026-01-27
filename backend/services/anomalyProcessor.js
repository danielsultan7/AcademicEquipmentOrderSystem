/**
 * Anomaly Processor - Background Job Handler
 * ==========================================
 * 
 * Processes audit logs for anomaly detection in the background.
 * This ensures audit logging is never blocked by AI analysis.
 * 
 * Architecture:
 * -------------
 * 1. Audit logger writes log to database
 * 2. Audit logger calls queueLogForAnalysis() (non-blocking)
 * 3. Background processor periodically processes the queue
 * 4. Results are stored in log_anomaly_scores table
 * 
 * Production Note:
 * ----------------
 * For production, replace the in-memory queue with Redis + Bull/BullMQ
 * This implementation is suitable for development and academic projects.
 */

const { analyzeLog, isServiceAvailable, formatLogForAnalysis } = require('./anomalyClient');
const { supabase } = require('../utils/supabaseClient');

// =============================================================================
// CONFIGURATION
// =============================================================================

const BATCH_SIZE = 10;                    // Process up to 10 logs at a time
const PROCESS_INTERVAL_MS = 10000;        // Check queue every 10 seconds
const MAX_RETRIES = 3;                    // Retry failed analyses up to 3 times
const RETRY_DELAY_MS = 30000;             // Wait 30 seconds before retry

// =============================================================================
// IN-MEMORY QUEUE (Replace with Redis in production)
// =============================================================================

const queue = [];
let isProcessing = false;
let processorInterval = null;

/**
 * Add a log to the anomaly detection queue
 * 
 * This is called by the audit logger after writing a log.
 * It's non-blocking - returns immediately.
 * 
 * @param {Object} logEntry - The audit log entry
 * @param {number} logEntry.id - Log ID
 * @param {string} logEntry.action - Action type (e.g., 'LOGIN', 'CREATE_ORDER')
 * @param {string} logEntry.description - Human-readable description
 * @param {Object} logEntry.metadata - Additional metadata
 */
function queueLogForAnalysis(logEntry) {
  if (!logEntry || !logEntry.id) {
    console.error('[AnomalyProcessor] ERROR: Invalid log entry - missing id');
    return;
  }
  
  queue.push({
    ...logEntry,
    retries: 0,
    queuedAt: Date.now()
  });
  
  console.log(`[AnomalyProcessor] Queued log ${logEntry.id} for analysis. Queue size: ${queue.length}`);
}

/**
 * Process the queue - called periodically by the background processor
 */
async function processQueue() {
  // Prevent concurrent processing
  if (isProcessing) {
    return;
  }
  
  // Nothing to process
  if (queue.length === 0) {
    return;
  }
  
  isProcessing = true;
  
  try {
    // Check if AI service is available
    const serviceUp = await isServiceAvailable();
    if (!serviceUp) {
      console.warn('[AnomalyProcessor] AI service unavailable, skipping processing');
      return;
    }
    
    // Get batch from queue
    const batch = queue.splice(0, BATCH_SIZE);
    console.log(`[AnomalyProcessor] Processing batch of ${batch.length} logs`);
    
    // Process each log
    for (const logEntry of batch) {
      try {
        // Format the log text for analysis
        const logText = formatLogForAnalysis(logEntry);
        
        // Get timestamp from log entry (created_at field from database)
        const timestamp = logEntry.created_at || logEntry.timestamp || null;
        
        // Call AI service with timestamp for nighttime detection
        const result = await analyzeLog(logEntry.id, logText, timestamp);
        
        if (result) {
          // Store result in database
          await storeAnomalyScore(result);
        } else {
          // Analysis failed - retry if under limit
          handleFailedAnalysis(logEntry);
        }
        
      } catch (error) {
        console.error(`[AnomalyProcessor] Error processing log ${logEntry.id}:`, error.message);
        handleFailedAnalysis(logEntry);
      }
    }
    
    console.log(`[AnomalyProcessor] Batch complete. Remaining in queue: ${queue.length}`);
    
  } finally {
    isProcessing = false;
  }
}

/**
 * Handle failed analysis - re-queue with retry limit
 */
function handleFailedAnalysis(logEntry) {
  if (logEntry.retries < MAX_RETRIES) {
    logEntry.retries++;
    logEntry.nextRetryAt = Date.now() + RETRY_DELAY_MS;
    queue.push(logEntry);
    console.warn(`[AnomalyProcessor] Re-queued log ${logEntry.id} (retry ${logEntry.retries}/${MAX_RETRIES})`);
  } else {
    console.error(`[AnomalyProcessor] Giving up on log ${logEntry.id} after ${MAX_RETRIES} retries`);
  }
}

/**
 * Store anomaly score in the database
 * 
 * @param {Object} result - Analysis result from AI service
 */
async function storeAnomalyScore(result) {
  try {
    const insertData = {
      log_id: result.log_id,
      anomaly_score: result.anomaly_score,
      is_anomaly: result.is_anomaly,
      model_name: result.model_name,
      threshold_used: 0.5,  // Binary classification: 0.5 threshold (score is 0 or 1)
      analysis_text: result.analysis_text || null,
      processing_time_ms: result.processing_time_ms || null,
      analyzed_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('log_anomaly_scores')
      .upsert(insertData, {
        onConflict: 'log_id',
        ignoreDuplicates: false  // Update on conflict
      })
      .select();
    
    if (error) {
      console.error(`[AnomalyProcessor] Failed to store score for log ${result.log_id}:`, error.message, error.code);
      return false;
    }
    
    const flag = result.is_anomaly ? '🚨 ANOMALY' : '✅ Normal';
    console.log(`[AnomalyProcessor] Stored: log ${result.log_id} → ${result.anomaly_score.toFixed(4)} ${flag}`);
    return true;
    
  } catch (error) {
    console.error(`[AnomalyProcessor] Storage error for log ${result.log_id}:`, error.message);
    return false;
  }
}

/**
 * Start the background processor
 */
function startProcessor() {
  if (processorInterval) {
    console.warn('[AnomalyProcessor] Processor already running');
    return;
  }
  
  console.log(`[AnomalyProcessor] Starting background processor (interval: ${PROCESS_INTERVAL_MS}ms)`);
  processorInterval = setInterval(processQueue, PROCESS_INTERVAL_MS);
  
  // Also run immediately
  processQueue();
}

/**
 * Stop the background processor
 */
function stopProcessor() {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log('[AnomalyProcessor] Background processor stopped');
  }
}

/**
 * Get queue statistics
 */
function getQueueStats() {
  return {
    queueSize: queue.length,
    isProcessing,
    isRunning: processorInterval !== null,
    oldestItem: queue.length > 0 ? queue[0].queuedAt : null
  };
}

module.exports = {
  queueLogForAnalysis,
  processQueue,
  startProcessor,
  stopProcessor,
  getQueueStats
};
