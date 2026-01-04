const { supabase } = require('./supabaseClient');

/**
 * Log an action to the database
 * Fails silently - logging errors should not break main flows
 * 
 * @param {number|null} userId - The user who performed the action
 * @param {string} action - Action type (e.g., 'LOGIN', 'CREATE_ORDER', 'UPDATE_PRODUCT')
 * @param {string} description - Human-readable description
 * @param {object|null} metadata - Optional additional data (stored as JSON)
 */
async function logAction(userId, action, description, metadata = null) {
  try {
    const { error } = await supabase
      .from('logs')
      .insert({
        user_id: userId,
        action: action,
        description: description,
        metadata: metadata,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('[Logger] Failed to write log:', error.message);
    }
  } catch (err) {
    // Fail silently - don't let logging break the main flow
    console.error('[Logger] Unexpected error:', err.message);
  }
}

// Action type constants for consistency
const ACTIONS = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  
  // Users
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  
  // Products
  CREATE_PRODUCT: 'CREATE_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  
  // Orders
  CREATE_ORDER: 'CREATE_ORDER',
  APPROVE_ORDER: 'APPROVE_ORDER',
  REJECT_ORDER: 'REJECT_ORDER'
};

module.exports = { logAction, ACTIONS };
