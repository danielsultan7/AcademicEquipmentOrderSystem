/**
 * TEST SUITE A: Authentication & Session Lifecycle
 * 
 * Tests:
 * - Successful login returns JWT token
 * - Failed login is rejected correctly
 * - Token is required for protected routes
 * - Invalid or expired token is rejected
 * - Logout action generates audit log
 */

const { TEST_USERS, SYSTEM_USER_ID } = require('./config');
const { api, login, getLogs, findLogs, TestRunner, assert, sleep } = require('./utils');

async function runAuthenticationTests() {
  console.log('\n🔐 SUITE A: Authentication & Session Lifecycle\n');
  const runner = new TestRunner('Authentication & Session');
  
  let adminToken = null;
  let adminUser = null;

  // =====================================================
  // A1: Successful login returns JWT token
  // =====================================================
  await runner.run('A1: Successful login returns JWT token', async () => {
    const response = await api.post('/auth/login', {
      username: TEST_USERS.admin.username,
      password: TEST_USERS.admin.password
    });
    
    assert.equal(response.status, 200, 'Login status');
    assert.exists(response.data.token, 'Token should exist');
    assert.exists(response.data.user, 'User should exist');
    assert.equal(response.data.user.role, TEST_USERS.admin.expectedRole, 'User role');
    
    // Store for later tests
    adminToken = response.data.token;
    adminUser = response.data.user;
  });

  // =====================================================
  // A2: Successful login generates audit log
  // =====================================================
  await runner.run('A2: Successful login generates audit log', async () => {
    // Small delay to ensure log is written
    await sleep(200);
    
    const logs = await getLogs();
    const loginLogs = findLogs(logs, {
      action: 'LOGIN',
      userId: adminUser.id
    });
    
    assert.greaterThan(loginLogs.length, 0, 'Should have LOGIN log');
    
    const latestLog = loginLogs[0];
    assert.exists(latestLog.metadata, 'Log should have metadata');
    assert.equal(latestLog.metadata.status, 'success', 'Login status should be success');
  });

  // =====================================================
  // A3: Failed login (wrong password) is rejected
  // =====================================================
  await runner.run('A3: Failed login (wrong password) is rejected', async () => {
    const response = await api.post('/auth/login', {
      username: TEST_USERS.admin.username,
      password: 'wrongpassword123'
    });
    
    assert.equal(response.status, 401, 'Should reject with 401');
    assert.exists(response.data.error, 'Should have error message');
  });

  // =====================================================
  // A4: Failed login generates audit log with SYSTEM_USER_ID
  // =====================================================
  await runner.run('A4: Failed login logs with SYSTEM_USER_ID', async () => {
    await sleep(200);
    
    const logs = await getLogs();
    const failedLogins = findLogs(logs, {
      action: 'LOGIN',
      userId: SYSTEM_USER_ID
    });
    
    // Find one with wrong_password reason
    const wrongPwLog = failedLogins.find(l => 
      l.metadata?.reason === 'wrong_password'
    );
    
    assert.exists(wrongPwLog, 'Should have failed login log');
    assert.equal(wrongPwLog.metadata.status, 'failed', 'Status should be failed');
  });

  // =====================================================
  // A5: Failed login (user not found) is rejected
  // =====================================================
  await runner.run('A5: Failed login (user not found) is rejected', async () => {
    const response = await api.post('/auth/login', {
      username: TEST_USERS.invalid.username,
      password: TEST_USERS.invalid.password
    });
    
    assert.equal(response.status, 401, 'Should reject with 401');
    // Should use generic message to prevent enumeration
    assert.exists(response.data.error, 'Should have error message');
  });

  // =====================================================
  // A6: Failed login (user not found) logs with SYSTEM_USER_ID
  // =====================================================
  await runner.run('A6: User not found logs with SYSTEM_USER_ID', async () => {
    await sleep(200);
    
    const logs = await getLogs();
    const notFoundLogs = findLogs(logs, {
      action: 'LOGIN',
      userId: SYSTEM_USER_ID
    });
    
    const notFoundLog = notFoundLogs.find(l => 
      l.metadata?.reason === 'user_not_found' &&
      l.metadata?.attempted_username === TEST_USERS.invalid.username
    );
    
    assert.exists(notFoundLog, 'Should have user_not_found log');
  });

  // =====================================================
  // A7: Missing credentials are rejected
  // =====================================================
  await runner.run('A7: Missing credentials are rejected', async () => {
    const response = await api.post('/auth/login', {});
    assert.equal(response.status, 400, 'Should reject with 400');
  });

  // =====================================================
  // A8: Token is required for protected routes
  // =====================================================
  await runner.run('A8: Token required for protected routes', async () => {
    // Try to create a product without token
    const response = await api.post('/products', {
      name: 'Test Product',
      price: 100
    });
    
    assert.equal(response.status, 401, 'Should reject with 401');
    assert.equal(response.data.error, 'No token provided', 'Error message');
  });

  // =====================================================
  // A9: Invalid token is rejected
  // =====================================================
  await runner.run('A9: Invalid token is rejected', async () => {
    const response = await api.post('/products', {
      name: 'Test Product',
      price: 100
    }, { token: 'invalid.token.here' });
    
    assert.equal(response.status, 401, 'Should reject with 401');
    assert.equal(response.data.error, 'Invalid token', 'Error message');
  });

  // =====================================================
  // A10: Malformed token is rejected
  // =====================================================
  await runner.run('A10: Malformed token is rejected', async () => {
    const response = await api.post('/products', {
      name: 'Test Product',
      price: 100
    }, { token: 'not-a-jwt-at-all' });
    
    assert.equal(response.status, 401, 'Should reject with 401');
  });

  // =====================================================
  // A11: Valid token allows access to protected routes
  // =====================================================
  await runner.run('A11: Valid token allows protected route access', async () => {
    // GET orders should work with valid token (even for read)
    const response = await api.get('/orders', { token: adminToken });
    
    // Should not be 401/403
    assert.notEqual(response.status, 401, 'Should not be unauthorized');
    assert.notEqual(response.status, 403, 'Should not be forbidden');
  });

  // =====================================================
  // A12: Logout endpoint works with valid token
  // =====================================================
  let logoutTestToken = null;
  await runner.run('A12: Logout endpoint works with valid token', async () => {
    // Login fresh for logout test
    const loginResponse = await login(
      TEST_USERS.customer.username,
      TEST_USERS.customer.password
    );
    assert.exists(loginResponse, 'Should login successfully');
    logoutTestToken = loginResponse.token;
    
    const response = await api.post('/auth/logout', { reason: 'manual' }, {
      token: logoutTestToken
    });
    
    assert.equal(response.status, 200, 'Logout should succeed');
    assert.equal(response.data.message, 'Logout successful', 'Success message');
  });

  // =====================================================
  // A13: Logout generates audit log
  // =====================================================
  await runner.run('A13: Logout generates audit log', async () => {
    await sleep(200);
    
    const logs = await getLogs();
    const logoutLogs = findLogs(logs, { action: 'LOGOUT' });
    
    assert.greaterThan(logoutLogs.length, 0, 'Should have LOGOUT log');
    
    const latestLogout = logoutLogs[0];
    assert.exists(latestLogout.metadata, 'Should have metadata');
    assert.equal(latestLogout.metadata.reason, 'manual', 'Reason should be manual');
  });

  // =====================================================
  // A14: Logout without token fails
  // =====================================================
  await runner.run('A14: Logout without token fails', async () => {
    const response = await api.post('/auth/logout', { reason: 'manual' });
    assert.equal(response.status, 401, 'Should reject with 401');
  });

  return runner.getResults();
}

module.exports = { runAuthenticationTests };

// Run directly if executed as main
if (require.main === module) {
  runAuthenticationTests()
    .then(results => {
      console.log('\n' + '='.repeat(50));
      results.passed === results.tests.length - results.skipped
        ? console.log('✅ All authentication tests passed!')
        : console.log(`❌ ${results.failed} test(s) failed`);
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}
