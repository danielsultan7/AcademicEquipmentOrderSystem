/**
 * TEST SUITE F: Data Consistency & Integrity
 * 
 * Tests:
 * - Inventory values remain consistent
 * - Orders reflect correct totals
 * - No orphaned records (order_items, logs)
 * - Logs correctly reference existing entities
 */

const { TEST_USERS, TEST_PREFIX } = require('./config');
const { api, login, getLogs, findLogs, TestRunner, assert, testName, sleep } = require('./utils');

async function runDataConsistencyTests() {
  console.log('\n🔗 SUITE F: Data Consistency & Integrity\n');
  const runner = new TestRunner('Data Consistency & Integrity');
  
  let adminAuth = null;
  let customerAuth = null;
  
  // Test data
  let testProduct = null;
  let initialStock = 50;

  await runner.run('F0: Setup - Login and create test product', async () => {
    adminAuth = await login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    assert.exists(adminAuth, 'Admin login failed');
    
    customerAuth = await login(TEST_USERS.customer.username, TEST_USERS.customer.password);
    assert.exists(customerAuth, 'Customer login failed');
    
    // Create a fresh product for consistency tests
    const productName = testName('ConsistencyProduct');
    const response = await api.post('/products', {
      name: productName,
      price: 100.00,
      quantity: initialStock,
      category: 'Test'
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 201, 'Should create product');
    testProduct = response.data;
  });

  // =====================================================
  // INVENTORY CONSISTENCY
  // =====================================================

  await runner.run('F1: Order reduces inventory correctly', async () => {
    const orderQty = 5;
    
    // Get stock before
    const before = await api.get(`/products/${testProduct.id}`);
    const stockBefore = before.data.quantity;
    
    // Create order
    const orderResponse = await api.post('/orders', {
      items: [{
        productId: testProduct.id,
        quantity: orderQty,
        unitPrice: testProduct.price
      }],
      totalAmount: orderQty * testProduct.price
    }, { token: customerAuth.token });
    
    assert.equal(orderResponse.status, 201, 'Should create order');
    
    // Get stock after
    const after = await api.get(`/products/${testProduct.id}`);
    const stockAfter = after.data.quantity;
    
    assert.equal(stockAfter, stockBefore - orderQty, 'Stock should decrease by order quantity');
  });

  await runner.run('F2: Multiple orders track cumulative inventory', async () => {
    // Get current stock
    const current = await api.get(`/products/${testProduct.id}`);
    const stockCurrent = current.data.quantity;
    
    // Create two orders
    const order1Qty = 3;
    const order2Qty = 2;
    
    await api.post('/orders', {
      items: [{ productId: testProduct.id, quantity: order1Qty, unitPrice: testProduct.price }],
      totalAmount: order1Qty * testProduct.price
    }, { token: customerAuth.token });
    
    await api.post('/orders', {
      items: [{ productId: testProduct.id, quantity: order2Qty, unitPrice: testProduct.price }],
      totalAmount: order2Qty * testProduct.price
    }, { token: customerAuth.token });
    
    // Get stock after
    const after = await api.get(`/products/${testProduct.id}`);
    const stockAfter = after.data.quantity;
    
    assert.equal(stockAfter, stockCurrent - order1Qty - order2Qty, 'Cumulative reduction');
  });

  await runner.run('F3: Rejected order restores correct quantity', async () => {
    // Get current stock
    const before = await api.get(`/products/${testProduct.id}`);
    const stockBefore = before.data.quantity;
    
    // Create order to reject
    const orderQty = 4;
    const orderResponse = await api.post('/orders', {
      items: [{ productId: testProduct.id, quantity: orderQty, unitPrice: testProduct.price }],
      totalAmount: orderQty * testProduct.price
    }, { token: customerAuth.token });
    
    const orderId = orderResponse.data.id;
    
    // Stock should be reduced
    const midCheck = await api.get(`/products/${testProduct.id}`);
    assert.equal(midCheck.data.quantity, stockBefore - orderQty, 'Stock reduced after order');
    
    // Reject order
    await api.put(`/orders/${orderId}/reject`, { reason: 'Test' }, { token: adminAuth.token });
    
    // Stock should be restored
    const after = await api.get(`/products/${testProduct.id}`);
    assert.equal(after.data.quantity, stockBefore, 'Stock restored after rejection');
  });

  await runner.run('F4: Approved order does not restore stock', async () => {
    // Get current stock  
    const before = await api.get(`/products/${testProduct.id}`);
    const stockBefore = before.data.quantity;
    
    // Create and approve order
    const orderQty = 2;
    const orderResponse = await api.post('/orders', {
      items: [{ productId: testProduct.id, quantity: orderQty, unitPrice: testProduct.price }],
      totalAmount: orderQty * testProduct.price
    }, { token: customerAuth.token });
    
    const orderId = orderResponse.data.id;
    
    // Approve order
    await api.put(`/orders/${orderId}/approve`, {}, { token: adminAuth.token });
    
    // Stock should remain reduced
    const after = await api.get(`/products/${testProduct.id}`);
    assert.equal(after.data.quantity, stockBefore - orderQty, 'Stock remains reduced');
  });

  // =====================================================
  // ORDER DATA INTEGRITY
  // =====================================================

  await runner.run('F5: Order items stored correctly', async () => {
    const orderResponse = await api.post('/orders', {
      items: [{ productId: testProduct.id, quantity: 1, unitPrice: testProduct.price }],
      totalAmount: testProduct.price
    }, { token: customerAuth.token });
    
    const orderId = orderResponse.data.id;
    
    // Get order by ID
    const getResponse = await api.get(`/orders/${orderId}`);
    
    assert.equal(getResponse.status, 200, 'Should get order');
    assert.equal(getResponse.data.items.length, 1, 'Should have 1 item');
    assert.equal(getResponse.data.items[0].productId, testProduct.id, 'Product ID matches');
    assert.equal(getResponse.data.items[0].quantity, 1, 'Quantity matches');
  });

  await runner.run('F6: Order totalAmount matches calculation', async () => {
    const qty = 3;
    const calculatedTotal = qty * testProduct.price;
    
    const orderResponse = await api.post('/orders', {
      items: [{ productId: testProduct.id, quantity: qty, unitPrice: testProduct.price }],
      totalAmount: calculatedTotal
    }, { token: customerAuth.token });
    
    assert.equal(orderResponse.status, 201, 'Should create order');
    assert.equal(orderResponse.data.totalAmount, calculatedTotal, 'Total should match');
  });

  await runner.run('F7: Order status transitions correctly', async () => {
    // Create order (pending)
    const orderResponse = await api.post('/orders', {
      items: [{ productId: testProduct.id, quantity: 1, unitPrice: testProduct.price }],
      totalAmount: testProduct.price
    }, { token: customerAuth.token });
    
    const orderId = orderResponse.data.id;
    assert.equal(orderResponse.data.status, 'pending', 'Initial status is pending');
    
    // Approve
    const approveResponse = await api.put(`/orders/${orderId}/approve`, {}, { token: adminAuth.token });
    assert.equal(approveResponse.data.status, 'approved', 'Status after approve');
    assert.exists(approveResponse.data.approvedAt, 'Has approvedAt timestamp');
  });

  // =====================================================
  // LOG REFERENTIAL INTEGRITY
  // =====================================================

  await runner.run('F8: Logs reference valid user IDs', async () => {
    const logs = await getLogs();
    const usersResponse = await api.get('/users');
    const validUserIds = new Set(usersResponse.data.map(u => u.id));
    validUserIds.add(0); // SYSTEM_USER_ID
    
    const invalidUserLogs = logs.filter(log => !validUserIds.has(log.userId));
    
    if (invalidUserLogs.length > 0) {
      console.log(`     ⚠️  Found ${invalidUserLogs.length} logs with invalid user IDs:`);
      invalidUserLogs.slice(0, 3).forEach(l => {
        console.log(`        - userId=${l.userId}, action=${l.action}`);
      });
    }
    
    assert.equal(invalidUserLogs.length, 0, 'All logs should reference valid users');
  });

  await runner.run('F9: Product creation log references existing product', async () => {
    const productName = testName('RefCheckProduct');
    const createResponse = await api.post('/products', {
      name: productName,
      price: 25,
      quantity: 10
    }, { token: adminAuth.token });
    
    const productId = createResponse.data.id;
    
    await sleep(200);
    const logs = await getLogs();
    const createLogs = findLogs(logs, { action: 'CREATE_PRODUCT' });
    const relevantLog = createLogs.find(l => l.metadata?.product_id === productId);
    
    assert.exists(relevantLog, 'Should have create log for product');
    
    // Verify product still exists
    const productCheck = await api.get(`/products/${productId}`);
    assert.equal(productCheck.status, 200, 'Product should exist');
  });

  await runner.run('F10: Order creation log references existing order', async () => {
    const orderResponse = await api.post('/orders', {
      items: [{ productId: testProduct.id, quantity: 1, unitPrice: testProduct.price }],
      totalAmount: testProduct.price
    }, { token: customerAuth.token });
    
    const orderId = orderResponse.data.id;
    
    await sleep(200);
    const logs = await getLogs();
    const orderLogs = findLogs(logs, { action: 'CREATE_ORDER' });
    const relevantLog = orderLogs.find(l => l.metadata?.order_id === orderId);
    
    assert.exists(relevantLog, 'Should have create log for order');
    
    // Verify order still exists
    const orderCheck = await api.get(`/orders/${orderId}`);
    assert.equal(orderCheck.status, 200, 'Order should exist');
  });

  // =====================================================
  // PRODUCT STATUS CONSISTENCY
  // =====================================================

  await runner.run('F11: Product status reflects quantity', async () => {
    // Get all products
    const response = await api.get('/products');
    const products = response.data;
    
    const inconsistent = products.filter(p => {
      if (p.quantity > 0 && p.status !== 'available') return true;
      if (p.quantity === 0 && p.status !== 'unavailable') return true;
      return false;
    });
    
    if (inconsistent.length > 0) {
      console.log(`     ⚠️  Found ${inconsistent.length} products with inconsistent status:`);
      inconsistent.slice(0, 3).forEach(p => {
        console.log(`        - ${p.name}: qty=${p.quantity}, status=${p.status}`);
      });
    }
    
    assert.equal(inconsistent.length, 0, 'All product statuses should match quantities');
  });

  // =====================================================
  // USER DATA INTEGRITY
  // =====================================================

  await runner.run('F12: All users have required fields', async () => {
    const response = await api.get('/users');
    const users = response.data;
    
    const incomplete = users.filter(u => !u.username || !u.email || !u.role);
    
    assert.equal(incomplete.length, 0, 'All users should have required fields');
  });

  await runner.run('F13: All user roles are valid', async () => {
    const validRoles = ['admin', 'staff', 'customer'];
    const response = await api.get('/users');
    const users = response.data;
    
    const invalidRoles = users.filter(u => !validRoles.includes(u.role));
    
    if (invalidRoles.length > 0) {
      console.log(`     ⚠️  Found ${invalidRoles.length} users with invalid roles:`);
      invalidRoles.forEach(u => {
        console.log(`        - ${u.username}: role=${u.role}`);
      });
    }
    
    assert.equal(invalidRoles.length, 0, 'All roles should be valid');
  });

  // =====================================================
  // CLEANUP
  // =====================================================

  await runner.run('F14: Cleanup - Delete test product', async () => {
    if (testProduct) {
      const response = await api.delete(`/products/${testProduct.id}`, { token: adminAuth.token });
      // May fail if product has orders - that's okay for cleanup
      console.log(`     Cleanup status: ${response.status}`);
    }
    assert.true(true, 'Cleanup attempted');
  });

  return runner.getResults();
}

module.exports = { runDataConsistencyTests };

// Run directly if executed as main
if (require.main === module) {
  runDataConsistencyTests()
    .then(results => {
      console.log('\n' + '='.repeat(50));
      results.passed === results.tests.length - results.skipped
        ? console.log('✅ All data consistency tests passed!')
        : console.log(`❌ ${results.failed} test(s) failed`);
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}
