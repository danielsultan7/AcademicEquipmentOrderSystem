const { supabase } = require('./supabaseClient');

// Lazy-load anomaly processor to avoid circular dependencies
let queueLogForAnalysis = null;
function getAnomalyQueue() {
  if (!queueLogForAnalysis) {
    try {
      const processor = require('../services/anomalyProcessor');
      queueLogForAnalysis = processor.queueLogForAnalysis;
    } catch (err) {
      // Anomaly service not available - fail silently
      console.warn('[AuditLogger] Anomaly processor not available:', err.message);
      queueLogForAnalysis = () => {}; // No-op function
    }
  }
  return queueLogForAnalysis;
}

/**
 * AUDIT LOGGER - Production-Grade Audit Trail System
 * 
 * CORE PRINCIPLES:
 * 1. Every log entry represents a real, meaningful system event
 * 2. Every log entry MUST have a valid user_id (NO NULLS)
 * 3. System actions use SYSTEM_USER_ID (0)
 * 4. Logs are immutable, append-only, accurate, and minimal
 */

// System user for non-authenticated actions (e.g., failed login attempts)
const SYSTEM_USER_ID = 0;

// Strict action types - only these are allowed
const AUDIT_ACTIONS = Object.freeze({
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  
  // Orders
  CREATE_ORDER: 'CREATE_ORDER',
  APPROVE_ORDER: 'APPROVE_ORDER',
  REJECT_ORDER: 'REJECT_ORDER',
  
  // Products
  CREATE_PRODUCT: 'CREATE_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  
  // Users
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER'
});

// Set of valid action types for validation
const VALID_ACTIONS = new Set(Object.values(AUDIT_ACTIONS));

/**
 * Audit Log Entry Structure
 * @typedef {Object} AuditLogEntry
 * @property {number} userId - REQUIRED: User who performed the action (use SYSTEM_USER_ID for system actions)
 * @property {string} actionType - REQUIRED: One of AUDIT_ACTIONS
 * @property {string} description - REQUIRED: Human-readable description
 * @property {Object} [metadata] - Optional structured data about the action
 */

/**
 * Log an audit action to the database
 * 
 * STRICT CONTRACT:
 * - userId is REQUIRED and must be a number
 * - actionType must be a valid AUDIT_ACTION
 * - description is REQUIRED
 * - Throws error if contract is violated (fail loudly)
 * 
 * @param {Object} params - Audit log parameters
 * @param {number} params.userId - REQUIRED: User ID (use SYSTEM_USER_ID for system actions)
 * @param {string} params.actionType - REQUIRED: Action type from AUDIT_ACTIONS
 * @param {string} params.description - REQUIRED: Human-readable description
 * @param {Object} [params.metadata] - Optional metadata object
 * @returns {Promise<{success: boolean, error?: string, logId?: number}>}
 */
async function logAuditAction({ userId, actionType, description, metadata = null }) {
  // ==================== STRICT VALIDATION ====================
  
  // Validate userId - MUST be a number, CANNOT be null/undefined
  if (userId === null || userId === undefined) {
    const error = `[AuditLogger] CRITICAL: userId is required but got ${userId}. Use SYSTEM_USER_ID (${SYSTEM_USER_ID}) for system actions.`;
    console.error(error);
    throw new Error(error);
  }
  
  if (typeof userId !== 'number' || isNaN(userId)) {
    const error = `[AuditLogger] CRITICAL: userId must be a number, got ${typeof userId}: ${userId}`;
    console.error(error);
    throw new Error(error);
  }
  
  // Validate actionType - MUST be a valid action
  if (!actionType || !VALID_ACTIONS.has(actionType)) {
    const error = `[AuditLogger] CRITICAL: Invalid actionType "${actionType}". Must be one of: ${Array.from(VALID_ACTIONS).join(', ')}`;
    console.error(error);
    throw new Error(error);
  }
  
  // Validate description - MUST be provided
  if (!description || typeof description !== 'string' || description.trim() === '') {
    const error = `[AuditLogger] CRITICAL: description is required and must be a non-empty string`;
    console.error(error);
    throw new Error(error);
  }
  
  // Validate metadata - must be object or null
  if (metadata !== null && typeof metadata !== 'object') {
    const error = `[AuditLogger] CRITICAL: metadata must be an object or null, got ${typeof metadata}`;
    console.error(error);
    throw new Error(error);
  }
  
  // ==================== DATABASE INSERT ====================
  
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

    // Queue for anomaly detection (non-blocking)
    // Only new logs are analyzed - this happens asynchronously
    try {
      const queue = getAnomalyQueue();
      queue({
        id: data.id,
        action: actionType,
        description: description.trim(),
        metadata: metadata
      });
    } catch (queueError) {
      // Fail silently - anomaly detection should never block logging
      console.warn('[AuditLogger] Failed to queue for anomaly detection:', queueError.message);
    }

    return { success: true, logId: data?.id };
    
  } catch (err) {
    console.error('[AuditLogger] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Helper function to get client IP from request
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
}

// ==================== BACKWARD COMPATIBILITY ====================

/**
 * Legacy logAction function for backward compatibility
 * Maps old signature to new audit logger
 * 
 * @deprecated Use logAuditAction instead
 */
async function logAction(userId, action, description, metadata = null) {
  // Convert null userId to SYSTEM_USER_ID for backward compatibility
  const safeUserId = (userId === null || userId === undefined) ? SYSTEM_USER_ID : userId;
  
  return logAuditAction({
    userId: safeUserId,
    actionType: action,
    description,
    metadata
  });
}

// Legacy ACTIONS export for backward compatibility
const ACTIONS = AUDIT_ACTIONS;

module.exports = {
  // New strict API
  logAuditAction,
  AUDIT_ACTIONS,
  SYSTEM_USER_ID,
  getClientIp,
  
  // Backward compatibility
  logAction,
  ACTIONS
};
