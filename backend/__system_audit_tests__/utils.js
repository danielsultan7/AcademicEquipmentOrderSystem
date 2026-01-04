/**
 * Test Utilities
 * Helper functions for system audit tests
 */

const { API_BASE_URL, API_TIMEOUT, TEST_PREFIX } = require('./config');

/**
 * Make HTTP request to API
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Request options
 * @param {Object} [options.body] - Request body
 * @param {string} [options.token] - JWT token for authentication
 * @returns {Promise<{status: number, data: any, headers: Object}>}
 */
async function apiRequest(method, endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json'
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const fetchOptions = {
    method,
    headers,
    timeout: API_TIMEOUT
  };

  if (options.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    throw new Error(`API request failed: ${error.message}`);
  }
}

// Convenience methods
const api = {
  get: (endpoint, options) => apiRequest('GET', endpoint, options),
  post: (endpoint, body, options = {}) => apiRequest('POST', endpoint, { ...options, body }),
  put: (endpoint, body, options = {}) => apiRequest('PUT', endpoint, { ...options, body }),
  delete: (endpoint, options) => apiRequest('DELETE', endpoint, options)
};

/**
 * Login and get JWT token
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{token: string, user: Object}|null>}
 */
async function login(username, password) {
  const response = await api.post('/auth/login', { username, password });
  if (response.status === 200 && response.data.token) {
    return {
      token: response.data.token,
      user: response.data.user
    };
  }
  return null;
}

/**
 * Get recent logs from API
 * @param {string} [token] - Optional auth token
 * @returns {Promise<Array>}
 */
async function getLogs(token) {
  const response = await api.get('/logs', { token });
  return response.status === 200 ? response.data : [];
}

/**
 * Find log entries matching criteria
 * @param {Array} logs - Array of log entries
 * @param {Object} criteria - Criteria to match
 * @returns {Array}
 */
function findLogs(logs, criteria) {
  return logs.filter(log => {
    for (const [key, value] of Object.entries(criteria)) {
      if (key === 'metadata') {
        // Deep compare metadata
        for (const [mKey, mValue] of Object.entries(value)) {
          if (log.metadata?.[mKey] !== mValue) return false;
        }
      } else if (log[key] !== value) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Generate unique test name with prefix
 * @param {string} base - Base name
 * @returns {string}
 */
function testName(base) {
  return `${TEST_PREFIX}${base}_${Date.now()}`;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test result tracker
 */
class TestRunner {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
  }

  async run(testName, testFn) {
    const startTime = Date.now();
    try {
      await testFn();
      this.passed++;
      this.tests.push({ name: testName, status: 'PASSED', duration: Date.now() - startTime });
      console.log(`  ✅ ${testName}`);
    } catch (error) {
      this.failed++;
      this.tests.push({ 
        name: testName, 
        status: 'FAILED', 
        error: error.message,
        duration: Date.now() - startTime
      });
      console.log(`  ❌ ${testName}`);
      console.log(`     Error: ${error.message}`);
    }
  }

  skip(testName, reason) {
    this.skipped++;
    this.tests.push({ name: testName, status: 'SKIPPED', reason });
    console.log(`  ⏭️  ${testName} (skipped: ${reason})`);
  }

  printSummary() {
    console.log(`\n📊 ${this.suiteName} Summary:`);
    console.log(`   Passed:  ${this.passed}`);
    console.log(`   Failed:  ${this.failed}`);
    console.log(`   Skipped: ${this.skipped}`);
    console.log(`   Total:   ${this.tests.length}`);
    return { passed: this.passed, failed: this.failed, skipped: this.skipped };
  }

  getResults() {
    return {
      suite: this.suiteName,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      tests: this.tests
    };
  }
}

/**
 * Assert helper functions
 */
const assert = {
  equal(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message} Expected ${expected}, got ${actual}`);
    }
  },
  notEqual(actual, expected, message = '') {
    if (actual === expected) {
      throw new Error(`${message} Expected value to not equal ${expected}`);
    }
  },
  true(value, message = '') {
    if (value !== true) {
      throw new Error(`${message} Expected true, got ${value}`);
    }
  },
  false(value, message = '') {
    if (value !== false) {
      throw new Error(`${message} Expected false, got ${value}`);
    }
  },
  exists(value, message = '') {
    if (value === null || value === undefined) {
      throw new Error(`${message} Expected value to exist, got ${value}`);
    }
  },
  isArray(value, message = '') {
    if (!Array.isArray(value)) {
      throw new Error(`${message} Expected array, got ${typeof value}`);
    }
  },
  includes(array, value, message = '') {
    if (!array.includes(value)) {
      throw new Error(`${message} Expected array to include ${value}`);
    }
  },
  greaterThan(actual, expected, message = '') {
    if (actual <= expected) {
      throw new Error(`${message} Expected ${actual} > ${expected}`);
    }
  },
  hasProperty(obj, prop, message = '') {
    if (!(prop in obj)) {
      throw new Error(`${message} Expected object to have property '${prop}'`);
    }
  }
};

module.exports = {
  api,
  apiRequest,
  login,
  getLogs,
  findLogs,
  testName,
  sleep,
  TestRunner,
  assert
};
