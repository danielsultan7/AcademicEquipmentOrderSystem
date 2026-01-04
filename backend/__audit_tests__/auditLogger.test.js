/**
 * AUDIT LOGGER TEST SUITE
 * 
 * This test file validates the audit logging system independently from production code.
 * Run with: node __audit_tests__/auditLogger.test.js
 * 
 * IMPORTANT: This folder can be safely deleted after validation.
 * Tests do NOT affect production code paths.
 */

// Load environment variables
require('dotenv').config();

// Simple test runner (no external dependencies)
const testResults = [];

function test(name, fn) {
  try {
    fn();
    testResults.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    testResults.push({ name, passed: false, error: error.message });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

function expect(value) {
  return {
    toBe: (expected) => {
      if (value !== expected) {
        throw new Error(`Expected ${expected} but got ${value}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(value)}`);
      }
    },
    toBeTruthy: () => {
      if (!value) {
        throw new Error(`Expected truthy value but got ${value}`);
      }
    },
    toBeNull: () => {
      if (value !== null) {
        throw new Error(`Expected null but got ${value}`);
      }
    },
    toContain: (expected) => {
      if (!value.includes(expected)) {
        throw new Error(`Expected "${value}" to contain "${expected}"`);
      }
    }
  };
}

async function runTests() {
  console.log('\n========================================');
  console.log('AUDIT LOGGER VALIDATION TESTS');
  console.log('========================================\n');

  // Import the audit logger (uses real implementation)
  const { 
    logAuditAction, 
    AUDIT_ACTIONS, 
    SYSTEM_USER_ID,
    getClientIp 
  } = require('../utils/auditLogger');

  // ==================== VALIDATION TESTS ====================

  console.log('--- Contract Validation Tests ---\n');

  // Test 1: userId is required
  test('Should throw error when userId is null', async () => {
    let threw = false;
    try {
      await logAuditAction({
        userId: null,
        actionType: AUDIT_ACTIONS.LOGIN,
        description: 'Test'
      });
    } catch (e) {
      threw = true;
      expect(e.message).toContain('userId is required');
    }
    expect(threw).toBe(true);
  });

  // Test 2: userId is required (undefined)
  test('Should throw error when userId is undefined', async () => {
    let threw = false;
    try {
      await logAuditAction({
        userId: undefined,
        actionType: AUDIT_ACTIONS.LOGIN,
        description: 'Test'
      });
    } catch (e) {
      threw = true;
      expect(e.message).toContain('userId is required');
    }
    expect(threw).toBe(true);
  });

  // Test 3: userId must be a number
  test('Should throw error when userId is not a number', async () => {
    let threw = false;
    try {
      await logAuditAction({
        userId: 'string',
        actionType: AUDIT_ACTIONS.LOGIN,
        description: 'Test'
      });
    } catch (e) {
      threw = true;
      expect(e.message).toContain('must be a number');
    }
    expect(threw).toBe(true);
  });

  // Test 4: actionType must be valid
  test('Should throw error for invalid actionType', async () => {
    let threw = false;
    try {
      await logAuditAction({
        userId: 1,
        actionType: 'INVALID_ACTION',
        description: 'Test'
      });
    } catch (e) {
      threw = true;
      expect(e.message).toContain('Invalid actionType');
    }
    expect(threw).toBe(true);
  });

  // Test 5: description is required
  test('Should throw error when description is empty', async () => {
    let threw = false;
    try {
      await logAuditAction({
        userId: 1,
        actionType: AUDIT_ACTIONS.LOGIN,
        description: ''
      });
    } catch (e) {
      threw = true;
      expect(e.message).toContain('description is required');
    }
    expect(threw).toBe(true);
  });

  // Test 6: SYSTEM_USER_ID is defined
  test('SYSTEM_USER_ID should be 0', () => {
    expect(SYSTEM_USER_ID).toBe(0);
  });

  // Test 7: All required actions are defined
  test('All required audit actions should be defined', () => {
    const requiredActions = [
      'LOGIN', 'LOGOUT',
      'CREATE_ORDER', 'APPROVE_ORDER', 'REJECT_ORDER',
      'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
      'CREATE_USER', 'UPDATE_USER', 'DELETE_USER'
    ];
    
    requiredActions.forEach(action => {
      expect(AUDIT_ACTIONS[action]).toBe(action);
    });
  });

  // Test 8: getClientIp helper exists
  test('getClientIp helper should exist', () => {
    expect(typeof getClientIp).toBe('function');
  });

  // Test 9: getClientIp extracts IP correctly
  test('getClientIp should extract IP from x-forwarded-for', () => {
    const mockReq = {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      connection: {},
      socket: {}
    };
    expect(getClientIp(mockReq)).toBe('192.168.1.1');
  });

  // Test 10: getClientIp returns unknown for empty request
  test('getClientIp should return unknown for empty headers', () => {
    const mockReq = {
      headers: {},
      connection: {},
      socket: {}
    };
    expect(getClientIp(mockReq)).toBe('unknown');
  });

  // ==================== SUMMARY ====================

  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  
  console.log(`Total: ${testResults.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED');
    process.exit(0);
  }
}

// Run tests
runTests().catch(console.error);
