/**
 * Test Configuration
 * Centralized configuration for system audit tests
 */

// API base URL - adjust if server runs on different port
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001/api';

// Test user credentials - these users must exist in the database
// NOTE: Database role constraint allows: 'admin', 'procurement_manager', 'customer'
const TEST_USERS = {
  admin: {
    username: 'test_admin',
    password: 'testpass123',
    expectedRole: 'admin'
  },
  staff: {
    username: 'test_manager',
    password: 'testpass123',
    expectedRole: 'procurement_manager'
  },
  customer: {
    username: 'test_customer',
    password: 'testpass123',
    expectedRole: 'customer'
  },
  // Non-existent user for negative testing
  invalid: {
    username: 'nonexistent_user_xyz',
    password: 'wrongpassword'
  }
};

// System user ID for unauthenticated actions (matches auditLogger.js)
const SYSTEM_USER_ID = 0;

// Test data prefixes (for cleanup)
const TEST_PREFIX = '__TEST_AUDIT__';

// Timeout for API calls (ms)
const API_TIMEOUT = 10000;

module.exports = {
  API_BASE_URL,
  TEST_USERS,
  SYSTEM_USER_ID,
  TEST_PREFIX,
  API_TIMEOUT
};
