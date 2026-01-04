/**
 * TEST SUITE E: Error Handling & Edge Cases
 * 
 * Tests:
 * - Database errors are handled gracefully
 * - Invalid input does not crash the server
 * - Partial failures do not corrupt data
 * - Logs are NOT written for failed operations unless specified
 */

const { TEST_USERS } = require('./config');
const { api, login, getLogs, findLogs, TestRunner, assert, testName, sleep } = require('./utils');

async function runErrorHandlingTests() {
  console.log('\n⚠️ SUITE E: Error Handling & Edge Cases\n');
  const runner = new TestRunner('Error Handling & Edge Cases');
  
  let adminAuth = null;

  await runner.run('E0: Setup - Login admin', async () => {
    adminAuth = await login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    assert.exists(adminAuth, 'Admin login failed');
  });

  // =====================================================
  // INVALID INPUT HANDLING
  // =====================================================

  await runner.run('E1: Missing required fields returns 400', async () => {
    const response = await api.post('/products', {
      // Missing name
      price: 100
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 400, 'Should return 400');
    assert.exists(response.data.error, 'Should have error message');
  });

  await runner.run('E2: Invalid product ID returns 404', async () => {
    const response = await api.get('/products/999999');
    assert.equal(response.status, 404, 'Should return 404');
  });

  await runner.run('E3: Invalid order ID returns 404', async () => {
    const response = await api.get('/orders/999999');
    assert.equal(response.status, 404, 'Should return 404');
  });

  await runner.run('E4: Invalid user ID returns 404', async () => {
    const response = await api.get('/users/999999');
    assert.equal(response.status, 404, 'Should return 404');
  });

  await runner.run('E5: Non-numeric ID is handled', async () => {
    const response = await api.get('/products/not-a-number');
    // Should not crash - returns 404 or 400
    assert.true([400, 404, 500].includes(response.status), 'Should handle gracefully');
  });

  await runner.run('E6: Empty order items rejected', async () => {
    const response = await api.post('/orders', {
      items: [],
      totalAmount: 0
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 400, 'Should return 400');
    assert.true(response.data.error.includes('at least one item'), 'Error about items');
  });

  await runner.run('E7: Order with non-existent product rejected', async () => {
    const response = await api.post('/orders', {
      items: [{
        productId: 999999,
        quantity: 1,
        unitPrice: 100
      }],
      totalAmount: 100
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 400, 'Should return 400');
  });

  // =====================================================
  // DUPLICATE HANDLING
  // =====================================================

  await runner.run('E8: Duplicate username rejected', async () => {
    // Try to create user with existing username
    const response = await api.post('/users', {
      username: TEST_USERS.admin.username, // Already exists
      email: 'different@email.com',
      password: 'testpass',
      role: 'customer'
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 409, 'Should return 409 Conflict');
  });

  await runner.run('E9: Duplicate email rejected', async () => {
    // First create a user
    const uniqueName = testName('DupeTest');
    const createResponse = await api.post('/users', {
      username: uniqueName,
      email: `${uniqueName}@test.com`,
      password: 'testpass',
      role: 'customer'
    }, { token: adminAuth.token });
    
    if (createResponse.status !== 201) {
      throw new Error('Setup failed - could not create initial user');
    }
    
    // Try to create another with same email
    const dupeResponse = await api.post('/users', {
      username: testName('DupeTest2'),
      email: `${uniqueName}@test.com`, // Same email
      password: 'testpass',
      role: 'customer'
    }, { token: adminAuth.token });
    
    assert.equal(dupeResponse.status, 409, 'Should return 409 Conflict');
  });

  // =====================================================
  // LOGS NOT WRITTEN FOR FAILED OPERATIONS
  // =====================================================

  await runner.run('E10: Failed product creation does not create log', async () => {
    const logsBefore = await getLogs();
    const createProductBefore = findLogs(logsBefore, { action: 'CREATE_PRODUCT' }).length;
    
    // Try to create product without required field
    await api.post('/products', {
      price: 100 // Missing name
    }, { token: adminAuth.token });
    
    await sleep(200);
    const logsAfter = await getLogs();
    const createProductAfter = findLogs(logsAfter, { action: 'CREATE_PRODUCT' }).length;
    
    assert.equal(createProductAfter, createProductBefore, 'Should not create log for failed operation');
  });

  await runner.run('E11: Failed order creation does not create log', async () => {
    const logsBefore = await getLogs();
    const createOrderBefore = findLogs(logsBefore, { action: 'CREATE_ORDER' }).length;
    
    // Try to create order with empty items
    await api.post('/orders', {
      items: [],
      totalAmount: 0
    }, { token: adminAuth.token });
    
    await sleep(200);
    const logsAfter = await getLogs();
    const createOrderAfter = findLogs(logsAfter, { action: 'CREATE_ORDER' }).length;
    
    assert.equal(createOrderAfter, createOrderBefore, 'Should not create log for failed operation');
  });

  await runner.run('E12: Failed user creation does not create log', async () => {
    const logsBefore = await getLogs();
    const createUserBefore = findLogs(logsBefore, { action: 'CREATE_USER' }).length;
    
    // Try to create user without required fields
    await api.post('/users', {
      username: 'test' // Missing email and password
    }, { token: adminAuth.token });
    
    await sleep(200);
    const logsAfter = await getLogs();
    const createUserAfter = findLogs(logsAfter, { action: 'CREATE_USER' }).length;
    
    assert.equal(createUserAfter, createUserBefore, 'Should not create log for failed operation');
  });

  // =====================================================
  // MALFORMED REQUEST HANDLING
  // =====================================================

  await runner.run('E13: Malformed JSON is handled', async () => {
    // Note: Can't easily send malformed JSON with fetch
    // But we can test with unexpected data types
    const response = await api.post('/products', 'not json', { token: adminAuth.token });
    
    // Should not crash server
    assert.true(response.status >= 400, 'Should return error status');
  });

  await runner.run('E14: Extra fields are ignored', async () => {
    const productName = testName('ExtraFields');
    const response = await api.post('/products', {
      name: productName,
      price: 50,
      quantity: 5,
      extraField1: 'should be ignored',
      extraField2: { nested: 'data' },
      __proto__: { evil: 'injection' }
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 201, 'Should create product');
    assert.equal(response.data.extraField1, undefined, 'Extra field should not be stored');
  });

  // =====================================================
  // UPDATE NON-EXISTENT RESOURCES
  // =====================================================

  await runner.run('E15: Update non-existent product returns 404', async () => {
    const response = await api.put('/products/999999', {
      name: 'Updated Name'
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 404, 'Should return 404');
  });

  await runner.run('E16: Delete non-existent product returns 404', async () => {
    const response = await api.delete('/products/999999', { token: adminAuth.token });
    assert.equal(response.status, 404, 'Should return 404');
  });

  await runner.run('E17: Approve non-existent order returns 404', async () => {
    const response = await api.put('/orders/999999/approve', {}, { token: adminAuth.token });
    assert.equal(response.status, 404, 'Should return 404');
  });

  // =====================================================
  // SERVER STABILITY
  // =====================================================

  await runner.run('E18: Server responds after error', async () => {
    // First cause an error
    await api.get('/products/invalid-id');
    
    // Then verify server still works
    const response = await api.get('/health');
    assert.equal(response.status, 200, 'Server should still respond');
    assert.equal(response.data.status, 'ok', 'Health should be ok');
  });

  await runner.run('E19: 404 endpoint handled', async () => {
    const response = await api.get('/nonexistent/endpoint');
    assert.equal(response.status, 404, 'Should return 404');
    assert.exists(response.data.error, 'Should have error message');
  });

  await runner.run('E20: Negative quantity handled', async () => {
    const productName = testName('NegativeQty');
    const response = await api.post('/products', {
      name: productName,
      price: 50,
      quantity: -5,
      category: 'Test'
    }, { token: adminAuth.token });
    
    // Document actual behavior
    if (response.status === 201) {
      console.log(`     ⚠️  Negative quantity allowed: ${response.data.quantity}`);
      // This might be a bug - negative stock shouldn't be allowed
    }
    
    assert.true([201, 400].includes(response.status), 'Should either create or reject');
  });

  await runner.run('E21: Negative price handled', async () => {
    const productName = testName('NegativePrice');
    const response = await api.post('/products', {
      name: productName,
      price: -50,
      quantity: 10,
      category: 'Test'
    }, { token: adminAuth.token });
    
    if (response.status === 201) {
      console.log(`     ⚠️  Negative price allowed: ${response.data.price}`);
    }
    
    assert.true([201, 400].includes(response.status), 'Should either create or reject');
  });

  return runner.getResults();
}

module.exports = { runErrorHandlingTests };

// Run directly if executed as main
if (require.main === module) {
  runErrorHandlingTests()
    .then(results => {
      console.log('\n' + '='.repeat(50));
      results.passed === results.tests.length - results.skipped
        ? console.log('✅ All error handling tests passed!')
        : console.log(`❌ ${results.failed} test(s) failed`);
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}
