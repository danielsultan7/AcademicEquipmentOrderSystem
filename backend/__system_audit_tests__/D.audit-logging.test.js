/**
 * TEST SUITE D: Audit Logging (CRITICAL)
 * 
 * For EVERY action, verify:
 * - Exactly ONE log entry is created
 * - user_id is correct (user or system)
 * - action_type is correct
 * - metadata structure matches specification
 * - No log entry has null or undefined user_id
 * - No silent logging failures occur
 */

const { TEST_USERS, SYSTEM_USER_ID, TEST_PREFIX } = require('./config');
const { api, login, getLogs, findLogs, TestRunner, assert, testName, sleep } = require('./utils');

async function runAuditLoggingTests() {
  console.log('\n📝 SUITE D: Audit Logging (CRITICAL)\n');
  const runner = new TestRunner('Audit Logging');
  
  let adminAuth = null;
  let customerAuth = null;
  
  // Track test entities for cleanup and verification
  let testProductId = null;
  let testOrderId = null;
  let testUserId = null;
  let logCountBefore = 0;

  // Setup
  await runner.run('D0: Setup - Login and get baseline log count', async () => {
    adminAuth = await login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    assert.exists(adminAuth, 'Admin login failed');
    
    customerAuth = await login(TEST_USERS.customer.username, TEST_USERS.customer.password);
    assert.exists(customerAuth, 'Customer login failed');
    
    await sleep(300);
    const logs = await getLogs();
    logCountBefore = logs.length;
    console.log(`     Baseline: ${logCountBefore} logs`);
  });

  // =====================================================
  // VERIFICATION: No NULL user_ids in existing logs
  // =====================================================
  
  await runner.run('D1: No existing logs have null user_id', async () => {
    const logs = await getLogs();
    const nullUserLogs = logs.filter(log => 
      log.userId === null || log.userId === undefined
    );
    
    if (nullUserLogs.length > 0) {
      console.log(`     ⚠️  Found ${nullUserLogs.length} logs with null userId:`);
      nullUserLogs.slice(0, 3).forEach(l => {
        console.log(`        - ${l.action}: ${l.description}`);
      });
    }
    
    assert.equal(nullUserLogs.length, 0, 'No logs should have null userId');
  });

  // =====================================================
  // LOGIN AUDIT LOGS
  // =====================================================

  await runner.run('D2: LOGIN success creates exactly one log', async () => {
    const logsBefore = await getLogs();
    const loginLogsBefore = findLogs(logsBefore, { action: 'LOGIN' }).length;
    
    // Fresh login
    const freshLogin = await login(TEST_USERS.staff.username, TEST_USERS.staff.password);
    assert.exists(freshLogin, 'Login should succeed');
    
    await sleep(300);
    const logsAfter = await getLogs();
    const loginLogsAfter = findLogs(logsAfter, { action: 'LOGIN' }).length;
    
    assert.equal(loginLogsAfter - loginLogsBefore, 1, 'Should create exactly 1 LOGIN log');
  });

  await runner.run('D3: LOGIN success log has correct user_id', async () => {
    const logs = await getLogs();
    const staffLoginLogs = findLogs(logs, { 
      action: 'LOGIN',
      userId: 2 // staff user ID (bob)
    });
    
    assert.greaterThan(staffLoginLogs.length, 0, 'Should have staff login log');
    
    const latestLogin = staffLoginLogs[0];
    assert.exists(latestLogin.metadata, 'Should have metadata');
    assert.equal(latestLogin.metadata.status, 'success', 'Status should be success');
  });

  await runner.run('D4: LOGIN failure log has SYSTEM_USER_ID', async () => {
    // Trigger failed login
    await api.post('/auth/login', {
      username: TEST_USERS.admin.username,
      password: 'definitelywrong'
    });
    
    await sleep(300);
    const logs = await getLogs();
    const failedLogins = findLogs(logs, {
      action: 'LOGIN',
      userId: SYSTEM_USER_ID
    });
    
    assert.greaterThan(failedLogins.length, 0, 'Should have failed login with SYSTEM_USER_ID');
    
    const latestFailed = failedLogins.find(l => 
      l.metadata?.status === 'failed' && l.metadata?.reason === 'wrong_password'
    );
    assert.exists(latestFailed, 'Should have wrong_password failure');
  });

  await runner.run('D5: LOGIN metadata structure is correct', async () => {
    const logs = await getLogs();
    const loginLogs = findLogs(logs, { action: 'LOGIN' });
    
    assert.greaterThan(loginLogs.length, 0, 'Should have LOGIN logs');
    
    const log = loginLogs[0];
    assert.exists(log.metadata, 'Should have metadata');
    assert.hasProperty(log.metadata, 'status', 'Metadata should have status');
    assert.hasProperty(log.metadata, 'ip', 'Metadata should have ip');
  });

  // =====================================================
  // LOGOUT AUDIT LOGS
  // =====================================================

  await runner.run('D6: LOGOUT creates audit log', async () => {
    // Login fresh
    const freshAuth = await login(TEST_USERS.customer.username, TEST_USERS.customer.password);
    
    const logsBefore = await getLogs();
    const logoutCountBefore = findLogs(logsBefore, { action: 'LOGOUT' }).length;
    
    // Logout
    await api.post('/auth/logout', { reason: 'manual' }, { token: freshAuth.token });
    
    await sleep(300);
    const logsAfter = await getLogs();
    const logoutCountAfter = findLogs(logsAfter, { action: 'LOGOUT' }).length;
    
    assert.equal(logoutCountAfter - logoutCountBefore, 1, 'Should create exactly 1 LOGOUT log');
  });

  await runner.run('D7: LOGOUT log has correct metadata', async () => {
    const logs = await getLogs();
    const logoutLogs = findLogs(logs, { action: 'LOGOUT' });
    
    assert.greaterThan(logoutLogs.length, 0, 'Should have LOGOUT logs');
    
    const latestLogout = logoutLogs[0];
    assert.exists(latestLogout.metadata, 'Should have metadata');
    assert.hasProperty(latestLogout.metadata, 'reason', 'Should have reason');
    assert.hasProperty(latestLogout.metadata, 'ip', 'Should have ip');
  });

  // =====================================================
  // CREATE_PRODUCT AUDIT LOGS
  // =====================================================

  await runner.run('D8: CREATE_PRODUCT creates audit log', async () => {
    const logsBefore = await getLogs();
    const createProductBefore = findLogs(logsBefore, { action: 'CREATE_PRODUCT' }).length;
    
    const productName = testName('AuditProduct');
    const response = await api.post('/products', {
      name: productName,
      price: 99.99,
      quantity: 10,
      category: 'Test'
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 201, 'Should create product');
    testProductId = response.data.id;
    
    await sleep(300);
    const logsAfter = await getLogs();
    const createProductAfter = findLogs(logsAfter, { action: 'CREATE_PRODUCT' }).length;
    
    assert.equal(createProductAfter - createProductBefore, 1, 'Should create exactly 1 CREATE_PRODUCT log');
  });

  await runner.run('D9: CREATE_PRODUCT log has correct user_id', async () => {
    const logs = await getLogs();
    const createLogs = findLogs(logs, { 
      action: 'CREATE_PRODUCT',
      userId: adminAuth.user.id
    });
    
    assert.greaterThan(createLogs.length, 0, 'Should have CREATE_PRODUCT log with admin user_id');
  });

  await runner.run('D10: CREATE_PRODUCT metadata structure', async () => {
    const logs = await getLogs();
    const createLogs = findLogs(logs, { action: 'CREATE_PRODUCT' });
    const latestCreate = createLogs[0];
    
    assert.exists(latestCreate.metadata, 'Should have metadata');
    assert.hasProperty(latestCreate.metadata, 'product_id', 'Should have product_id');
    assert.hasProperty(latestCreate.metadata, 'name', 'Should have name');
    assert.hasProperty(latestCreate.metadata, 'initial_quantity', 'Should have initial_quantity');
  });

  // =====================================================
  // UPDATE_PRODUCT AUDIT LOGS
  // =====================================================

  await runner.run('D11: UPDATE_PRODUCT creates audit log', async () => {
    const logsBefore = await getLogs();
    const updateProductBefore = findLogs(logsBefore, { action: 'UPDATE_PRODUCT' }).length;
    
    await api.put(`/products/${testProductId}`, {
      price: 149.99
    }, { token: adminAuth.token });
    
    await sleep(300);
    const logsAfter = await getLogs();
    const updateProductAfter = findLogs(logsAfter, { action: 'UPDATE_PRODUCT' }).length;
    
    assert.equal(updateProductAfter - updateProductBefore, 1, 'Should create exactly 1 UPDATE_PRODUCT log');
  });

  await runner.run('D12: UPDATE_PRODUCT metadata has field changes', async () => {
    const logs = await getLogs();
    const updateLogs = findLogs(logs, { action: 'UPDATE_PRODUCT' });
    const latestUpdate = updateLogs[0];
    
    assert.exists(latestUpdate.metadata, 'Should have metadata');
    assert.hasProperty(latestUpdate.metadata, 'product_id', 'Should have product_id');
    assert.hasProperty(latestUpdate.metadata, 'fields_changed', 'Should have fields_changed');
    assert.hasProperty(latestUpdate.metadata, 'old_values', 'Should have old_values');
    assert.hasProperty(latestUpdate.metadata, 'new_values', 'Should have new_values');
  });

  // =====================================================
  // CREATE_ORDER AUDIT LOGS
  // =====================================================

  await runner.run('D13: CREATE_ORDER creates audit log', async () => {
    const logsBefore = await getLogs();
    const createOrderBefore = findLogs(logsBefore, { action: 'CREATE_ORDER' }).length;
    
    const response = await api.post('/orders', {
      items: [{
        productId: testProductId,
        quantity: 2,
        unitPrice: 149.99
      }],
      totalAmount: 299.98
    }, { token: customerAuth.token });
    
    assert.equal(response.status, 201, 'Should create order');
    testOrderId = response.data.id;
    
    await sleep(300);
    const logsAfter = await getLogs();
    const createOrderAfter = findLogs(logsAfter, { action: 'CREATE_ORDER' }).length;
    
    assert.equal(createOrderAfter - createOrderBefore, 1, 'Should create exactly 1 CREATE_ORDER log');
  });

  await runner.run('D14: CREATE_ORDER log has customer user_id', async () => {
    const logs = await getLogs();
    const orderLogs = findLogs(logs, { 
      action: 'CREATE_ORDER',
      userId: customerAuth.user.id
    });
    
    assert.greaterThan(orderLogs.length, 0, 'Should have CREATE_ORDER with customer user_id');
  });

  await runner.run('D15: CREATE_ORDER metadata structure', async () => {
    const logs = await getLogs();
    const orderLogs = findLogs(logs, { action: 'CREATE_ORDER' });
    const latestOrder = orderLogs[0];
    
    assert.exists(latestOrder.metadata, 'Should have metadata');
    assert.hasProperty(latestOrder.metadata, 'order_id', 'Should have order_id');
    assert.hasProperty(latestOrder.metadata, 'total_amount', 'Should have total_amount');
    assert.hasProperty(latestOrder.metadata, 'items_count', 'Should have items_count');
  });

  // =====================================================
  // APPROVE_ORDER AUDIT LOGS
  // =====================================================

  await runner.run('D16: APPROVE_ORDER creates audit log', async () => {
    const logsBefore = await getLogs();
    const approveBefore = findLogs(logsBefore, { action: 'APPROVE_ORDER' }).length;
    
    await api.put(`/orders/${testOrderId}/approve`, {}, { token: adminAuth.token });
    
    await sleep(300);
    const logsAfter = await getLogs();
    const approveAfter = findLogs(logsAfter, { action: 'APPROVE_ORDER' }).length;
    
    assert.equal(approveAfter - approveBefore, 1, 'Should create exactly 1 APPROVE_ORDER log');
  });

  await runner.run('D17: APPROVE_ORDER metadata structure', async () => {
    const logs = await getLogs();
    const approveLogs = findLogs(logs, { action: 'APPROVE_ORDER' });
    const latestApprove = approveLogs[0];
    
    assert.exists(latestApprove.metadata, 'Should have metadata');
    assert.hasProperty(latestApprove.metadata, 'order_id', 'Should have order_id');
    assert.hasProperty(latestApprove.metadata, 'previous_status', 'Should have previous_status');
    assert.hasProperty(latestApprove.metadata, 'new_status', 'Should have new_status');
  });

  // =====================================================
  // REJECT_ORDER AUDIT LOGS  
  // =====================================================

  let orderToReject = null;
  await runner.run('D18: Setup - Create order for rejection test', async () => {
    const response = await api.post('/orders', {
      items: [{
        productId: testProductId,
        quantity: 1,
        unitPrice: 149.99
      }],
      totalAmount: 149.99
    }, { token: customerAuth.token });
    
    assert.equal(response.status, 201, 'Should create order');
    orderToReject = response.data.id;
  });

  await runner.run('D19: REJECT_ORDER creates audit log', async () => {
    const logsBefore = await getLogs();
    const rejectBefore = findLogs(logsBefore, { action: 'REJECT_ORDER' }).length;
    
    await api.put(`/orders/${orderToReject}/reject`, { reason: 'Test rejection' }, {
      token: adminAuth.token
    });
    
    await sleep(300);
    const logsAfter = await getLogs();
    const rejectAfter = findLogs(logsAfter, { action: 'REJECT_ORDER' }).length;
    
    assert.equal(rejectAfter - rejectBefore, 1, 'Should create exactly 1 REJECT_ORDER log');
  });

  await runner.run('D20: REJECT_ORDER metadata has reason', async () => {
    const logs = await getLogs();
    const rejectLogs = findLogs(logs, { action: 'REJECT_ORDER' });
    const latestReject = rejectLogs[0];
    
    assert.exists(latestReject.metadata, 'Should have metadata');
    assert.hasProperty(latestReject.metadata, 'reason', 'Should have reason');
  });

  // =====================================================
  // USER MANAGEMENT AUDIT LOGS
  // =====================================================

  await runner.run('D21: CREATE_USER creates audit log', async () => {
    const logsBefore = await getLogs();
    const createUserBefore = findLogs(logsBefore, { action: 'CREATE_USER' }).length;
    
    const username = testName('AuditUser');
    const response = await api.post('/users', {
      username: username,
      email: `${username}@test.com`,
      password: 'testpass123',
      role: 'customer'
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 201, 'Should create user');
    testUserId = response.data.id;
    
    await sleep(300);
    const logsAfter = await getLogs();
    const createUserAfter = findLogs(logsAfter, { action: 'CREATE_USER' }).length;
    
    assert.equal(createUserAfter - createUserBefore, 1, 'Should create exactly 1 CREATE_USER log');
  });

  await runner.run('D22: CREATE_USER metadata structure', async () => {
    const logs = await getLogs();
    const createUserLogs = findLogs(logs, { action: 'CREATE_USER' });
    const latestCreate = createUserLogs[0];
    
    assert.exists(latestCreate.metadata, 'Should have metadata');
    assert.hasProperty(latestCreate.metadata, 'created_user_id', 'Should have created_user_id');
    assert.hasProperty(latestCreate.metadata, 'username', 'Should have username');
    assert.hasProperty(latestCreate.metadata, 'role', 'Should have role');
  });

  await runner.run('D23: UPDATE_USER creates audit log', async () => {
    const logsBefore = await getLogs();
    const updateUserBefore = findLogs(logsBefore, { action: 'UPDATE_USER' }).length;
    
    await api.put(`/users/${testUserId}`, { role: 'staff' }, { token: adminAuth.token });
    
    await sleep(300);
    const logsAfter = await getLogs();
    const updateUserAfter = findLogs(logsAfter, { action: 'UPDATE_USER' }).length;
    
    assert.equal(updateUserAfter - updateUserBefore, 1, 'Should create exactly 1 UPDATE_USER log');
  });

  await runner.run('D24: DELETE_USER creates audit log', async () => {
    const logsBefore = await getLogs();
    const deleteUserBefore = findLogs(logsBefore, { action: 'DELETE_USER' }).length;
    
    await api.delete(`/users/${testUserId}`, { token: adminAuth.token });
    
    await sleep(300);
    const logsAfter = await getLogs();
    const deleteUserAfter = findLogs(logsAfter, { action: 'DELETE_USER' }).length;
    
    assert.equal(deleteUserAfter - deleteUserBefore, 1, 'Should create exactly 1 DELETE_USER log');
  });

  await runner.run('D25: DELETE_USER metadata has deleted info', async () => {
    const logs = await getLogs();
    const deleteLogs = findLogs(logs, { action: 'DELETE_USER' });
    const latestDelete = deleteLogs[0];
    
    assert.exists(latestDelete.metadata, 'Should have metadata');
    assert.hasProperty(latestDelete.metadata, 'deleted_user_id', 'Should have deleted_user_id');
    assert.hasProperty(latestDelete.metadata, 'deleted_username', 'Should have deleted_username');
  });

  // =====================================================
  // DELETE_PRODUCT AUDIT LOG
  // =====================================================

  await runner.run('D26: DELETE_PRODUCT creates audit log', async () => {
    const logsBefore = await getLogs();
    const deleteProductBefore = findLogs(logsBefore, { action: 'DELETE_PRODUCT' }).length;
    
    await api.delete(`/products/${testProductId}`, { token: adminAuth.token });
    
    await sleep(300);
    const logsAfter = await getLogs();
    const deleteProductAfter = findLogs(logsAfter, { action: 'DELETE_PRODUCT' }).length;
    
    assert.equal(deleteProductAfter - deleteProductBefore, 1, 'Should create exactly 1 DELETE_PRODUCT log');
  });

  // =====================================================
  // FINAL VERIFICATION
  // =====================================================

  await runner.run('D27: Final check - No null user_ids after all tests', async () => {
    const logs = await getLogs();
    const nullUserLogs = logs.filter(log => 
      log.userId === null || log.userId === undefined
    );
    
    assert.equal(nullUserLogs.length, 0, 'No logs should have null userId after all tests');
  });

  await runner.run('D28: All action types have at least one log', async () => {
    const logs = await getLogs();
    const actionTypes = [
      'LOGIN', 'LOGOUT', 
      'CREATE_ORDER', 'APPROVE_ORDER', 'REJECT_ORDER',
      'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
      'CREATE_USER', 'UPDATE_USER', 'DELETE_USER'
    ];
    
    const missingTypes = [];
    for (const type of actionTypes) {
      const count = findLogs(logs, { action: type }).length;
      if (count === 0) {
        missingTypes.push(type);
      }
    }
    
    if (missingTypes.length > 0) {
      console.log(`     ⚠️  Missing log types: ${missingTypes.join(', ')}`);
    }
    
    assert.equal(missingTypes.length, 0, 'All action types should have logs');
  });

  return runner.getResults();
}

module.exports = { runAuditLoggingTests };

// Run directly if executed as main
if (require.main === module) {
  runAuditLoggingTests()
    .then(results => {
      console.log('\n' + '='.repeat(50));
      results.passed === results.tests.length - results.skipped
        ? console.log('✅ All audit logging tests passed!')
        : console.log(`❌ ${results.failed} test(s) failed`);
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}
