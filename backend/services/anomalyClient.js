/**
 * Anomaly Detection Client
 * ========================
 * 
 * Client for communicating with the Python AI anomaly detection service.
 * 
 * Design Decisions:
 * -----------------
 * 1. NON-BLOCKING: All calls are async and should be called from background jobs
 * 2. FAULT-TOLERANT: Service unavailability doesn't break audit logging
 * 3. TIMEOUT PROTECTION: Prevents hanging if AI service is slow
 * 4. SIMPLE INTERFACE: Just pass log data, get anomaly score back
 * 
 * Usage:
 * ------
 * const { analyzeLog, isServiceAvailable } = require('./services/anomalyClient');
 * 
 * // Check if service is up
 * if (await isServiceAvailable()) {
 *   const result = await analyzeLog(logId, logText);
 *   if (result) {
 *     // Store result in log_anomaly_scores table
 *   }
 * }
 */

// Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';
const REQUEST_TIMEOUT_MS = 5000; // 5 seconds

/**
 * Check if the AI service is available and healthy
 * @returns {Promise<boolean>} True if service is healthy
 */
async function isServiceAvailable() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${AI_SERVICE_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const data = await response.json();
    return data.status === 'healthy' && data.model_loaded === true;

  } catch (error) {
    // Service unavailable - this is expected during startup or if service is down
    console.warn('[AnomalyClient] Service health check failed:', error.message);
    return false;
  }
}
/**
 * Analyze a single audit log for anomalies
 * 
 * @param {number} logId - The ID of the audit log entry
 * @param {string} logText - The text content to analyze
 * @returns {Promise<Object|null>} Anomaly result or null on failure
 * 
 * @example
 * const result = await analyzeLog(123, "Failed login attempt for user admin");
 * // result = {
 * //   log_id: 123,
 * //   anomaly_score: 0.9234,
 * //   is_anomaly: true,
 * //   model_name: "distilbert-base-uncased-finetuned-sst-2-english"
 * // }
 */
async function analyzeLog(logId, logText) {
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(`${AI_SERVICE_URL}/analyze-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        log_id: logId,
        log_text: logText
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const processingTime = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error(`[AnomalyClient] Analysis failed for log ${logId}:`, error.detail || response.status);
      return null;
    }

    const result = await response.json();
    console.log(`[AnomalyClient] Log ${logId} analyzed: score=${result.anomaly_score}, anomaly=${result.is_anomaly} (${processingTime}ms)`);
    
    // Add analysis metadata to result
    return {
      ...result,
      analysis_text: logText,
      processing_time_ms: processingTime
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[AnomalyClient] Request timeout for log ${logId}`);
    } else {
      console.error(`[AnomalyClient] Failed to analyze log ${logId}:`, error.message);
    }
    return null;
  }
}

/**
 * Analyze multiple logs in a single request (more efficient for batch processing)
 * 
 * @param {Array<{logId: number, logText: string}>} logs - Array of logs to analyze
 * @returns {Promise<Array>} Array of anomaly results
 */
async function analyzeBatch(logs) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS * 2);

    const response = await fetch(`${AI_SERVICE_URL}/analyze-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(
        logs.map(log => ({
          log_id: log.logId,
          log_text: log.logText
        }))
      ),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[AnomalyClient] Batch analysis failed:', response.status);
      return [];
    }

    const results = await response.json();
    console.log(`[AnomalyClient] Batch analyzed: ${results.length}/${logs.length} logs`);
    return results;

  } catch (error) {
    console.error('[AnomalyClient] Batch analysis error:', error.message);
    return [];
  }
}

/**
 * Format an audit log entry into analyzable text
 * 
 * This creates a human-readable string from structured log data
 * that the sentiment model can analyze effectively.
 * 
 * @param {Object} logEntry - Audit log entry from database
 * @returns {string} Formatted text for analysis
 */
function formatLogForAnalysis(logEntry) {
  const parts = [];

  // Include action type
  if (logEntry.action) {
    parts.push(`Action: ${logEntry.action}`);
  }

  // Include description (most important for sentiment)
  if (logEntry.description) {
    parts.push(logEntry.description);
  }

  // Include relevant metadata
  if (logEntry.metadata) {
    const meta = logEntry.metadata;
    
    if (meta.status) {
      parts.push(`Status: ${meta.status}`);
    }
    if (meta.reason) {
      parts.push(`Reason: ${meta.reason}`);
    }
    if (meta.ip) {
      parts.push(`IP: ${meta.ip}`);
    }
  }

  return parts.join('. ');
}

module.exports = {
  analyzeLog,
  analyzeBatch,
  isServiceAvailable,
  formatLogForAnalysis,
  AI_SERVICE_URL
};
