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
 * 5. HTTPS: Uses HTTPS for secure communication with self-signed certificate
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

const https = require('https');

// Configuration
// NOTE: Changed to HTTPS for secure communication
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://localhost:5000';
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds (LLM inference takes ~10s)

// =============================================================================
// HTTPS Agent for Self-Signed Certificate
// =============================================================================
// Since we're using a self-signed certificate for local development,
// we need to disable certificate verification for service-to-service calls.
// 
// ⚠️ WARNING: This is for DEVELOPMENT ONLY. In production, use proper CA certs.
// =============================================================================

const httpsAgent = new https.Agent({
  rejectUnauthorized: false  // Accept self-signed certificates (dev only!)
});

// Import undici Agent for fetch with self-signed certificate support
// undici is the HTTP client that powers Node.js native fetch
const { Agent } = require('undici');

// Create a reusable agent that accepts self-signed certificates
// This is cached to avoid creating new agents for every request
const unsafeAgent = new Agent({
  connect: {
    rejectUnauthorized: false  // Accept self-signed certificates (dev only!)
  }
});

/**
 * Custom fetch wrapper that uses our HTTPS agent for self-signed certs
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function secureFetch(url, options = {}) {
  // Use the built-in fetch with our custom undici agent for HTTPS
  // This allows us to make HTTPS requests to servers with self-signed certificates
  return fetch(url, {
    ...options,
    dispatcher: unsafeAgent
  });
}

/**
 * Check if the AI service is available and healthy
 * @returns {Promise<boolean>} True if service is healthy
 */
async function isServiceAvailable() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await secureFetch(`${AI_SERVICE_URL}/health`, {
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
 * @param {string} [timestamp] - ISO timestamp of the log entry (for nighttime detection)
 * @returns {Promise<Object|null>} Anomaly result or null on failure
 * 
 * @example
 * const result = await analyzeLog(123, "Admin deleted user", "2026-01-26T02:30:00Z");
 * // result = {
 * //   log_id: 123,
 * //   anomaly_score: 1.0,
 * //   is_anomaly: true,
 * //   model_name: "Qwen/Qwen2.5-1.5B-Instruct"
 * // }
 */
async function analyzeLog(logId, logText, timestamp = null) {
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const requestBody = {
      log_id: logId,
      log_text: logText
    };
    
    // Include timestamp if provided (used for nighttime admin detection)
    if (timestamp) {
      requestBody.timestamp = timestamp;
    }

    const response = await secureFetch(`${AI_SERVICE_URL}/analyze-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
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
 * @param {Array<{logId: number, logText: string, timestamp?: string}>} logs - Array of logs to analyze
 * @returns {Promise<Array>} Array of anomaly results
 */
async function analyzeBatch(logs) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS * logs.length);

    const response = await secureFetch(`${AI_SERVICE_URL}/analyze-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(
        logs.map(log => ({
          log_id: log.logId,
          log_text: log.logText,
          timestamp: log.timestamp || null
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
 * This creates natural language text optimized for the LLM anomaly detector.
 * The format is designed to match the patterns the AI model is trained to recognize:
 * - SQL injection patterns (SELECT, DROP, --, OR 1=1)
 * - XSS patterns (<script>, onerror=)
 * - Auth failures (failed login, invalid password)
 * - Admin activity (clearly marked with "Admin" prefix)
 * - Suspicious input (path traversal, sqlmap)
 * 
 * @param {Object} logEntry - Audit log entry from database
 * @returns {string} Formatted text for analysis
 */
function formatLogForAnalysis(logEntry) {
  const parts = [];
  const meta = logEntry.metadata || {};
  
  // Determine if this is an admin action (check metadata for user role)
  const isAdmin = meta.user_role === 'admin' || 
                  meta.role === 'admin' ||
                  logEntry.action?.includes('ADMIN') ||
                  logEntry.description?.toLowerCase().includes('admin');
  
  // Prefix admin actions clearly for nighttime detection
  if (isAdmin) {
    parts.push('Admin');
  }
  
  // Format based on action type for better pattern recognition
  switch (logEntry.action) {
    case 'LOGIN':
      if (meta.status === 'failed' || meta.reason) {
        // Failed login - use natural language the model recognizes
        parts.push(`failed login attempt for user: ${meta.attempted_username || 'unknown'}`);
        if (meta.reason) {
          parts.push(`(${meta.reason.replace(/_/g, ' ')})`);
        }
      } else {
        parts.push('user logged in successfully');
      }
      break;
      
    case 'LOGOUT':
      parts.push('user logged out');
      break;
      
    case 'CREATE_ORDER':
    case 'APPROVE_ORDER':
    case 'REJECT_ORDER':
      // Include the full description for order actions
      if (logEntry.description) {
        parts.push(logEntry.description);
      }
      break;
      
    case 'CREATE_PRODUCT':
    case 'UPDATE_PRODUCT':
    case 'DELETE_PRODUCT':
      if (logEntry.description) {
        parts.push(logEntry.description);
      }
      break;
      
    case 'CREATE_USER':
    case 'UPDATE_USER':
    case 'DELETE_USER':
      if (logEntry.description) {
        parts.push(logEntry.description);
      }
      // Check for privilege escalation patterns
      if (meta.new_role === 'admin' || meta.role_change) {
        parts.push(`role changed to: ${meta.new_role || meta.role_change}`);
      }
      break;
      
    default:
      // For unknown actions, use description directly
      if (logEntry.description) {
        parts.push(logEntry.description);
      }
  }
  
  // Append any suspicious input data that might contain attack patterns
  // This ensures SQL injection, XSS, and path traversal patterns are visible
  if (meta.input || meta.query || meta.data) {
    const suspiciousData = meta.input || meta.query || meta.data;
    if (typeof suspiciousData === 'string') {
      parts.push(`input: ${suspiciousData}`);
    }
  }
  
  // Include IP for context (optional, helps with some patterns)
  if (meta.ip && meta.ip !== 'unknown') {
    parts.push(`from IP ${meta.ip}`);
  }
  
  return parts.join(' ');
}

module.exports = {
  analyzeLog,
  analyzeBatch,
  isServiceAvailable,
  formatLogForAnalysis,
  AI_SERVICE_URL
};
