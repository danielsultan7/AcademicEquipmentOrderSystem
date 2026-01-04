/**
 * TEST SUITE C: Core Business Flows
 * 
 * Tests:
 * - Products: Create, Update, Delete, Stock behavior
 * - Orders: Create with items, Approve, Reject, Inventory adjustments
 * - Users: Create, Update, Delete
 */

const { TEST_USERS, TEST_PREFIX } = require('./config');
const { api, login, TestRunner, assert, testName, sleep } = require('./utils');

async function runBusinessFlowTests() {
  console.log('\n📦 SUITE C: Core Business Flows\n');
  const runner = new TestRunner('Core Business Flows');
  
  let adminAuth = null;
  let customerAuth = null;
  
  // Test data tracking
  let createdProductId = null;
  let createdOrderId = null;
  let createdUserId = null;

  // Setup
  await runner.run('C0: Setup - Login test users', async () => {
    adminAuth = await login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    assert.exists(adminAuth, 'Admin login failed');
    
    customerAuth = await login(TEST_USERS.customer.username, TEST_USERS.customer.password);
    assert.exists(customerAuth, 'Customer login failed');
  });

  // =====================================================
  // PRODUCTS
  // =====================================================
  
  await runner.run('C1: Create product with all fields', async () => {
    const productName = testName('FlowProduct');
    const response = await api.post('/products', {
      name: productName,
      description: 'Test product for flow testing',
      price: 150.00,
      quantity: 100,
      category: 'Test Equipment'
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 201, 'Should create product');
    assert.exists(response.data.id, 'Should have ID');
    assert.equal(response.data.name, productName, 'Name should match');
    assert.equal(response.data.quantity, 100, 'Quantity should be 100');
    assert.equal(response.data.status, 'available', 'Status should be available');
    
    createdProductId = response.data.id;
  });

  await runner.run('C2: Product status is "available" when quantity > 0', async () => {
    const response = await api.get(`/products/${createdProductId}`, { token: adminAuth.token });
    
    assert.equal(response.status, 200, 'Should get product');
    assert.equal(response.data.status, 'available', 'Status should be available');
  });

  await runner.run('C3: Update product price', async () => {
    const response = await api.put(`/products/${createdProductId}`, {
      price: 175.00
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 200, 'Should update product');
    assert.equal(response.data.price, 175.00, 'Price should be updated');
  });

  await runner.run('C4: Update product quantity to 0 sets status unavailable', async () => {
    const response = await api.put(`/products/${createdProductId}`, {
      quantity: 0
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 200, 'Should update product');
    assert.equal(response.data.quantity, 0, 'Quantity should be 0');
    assert.equal(response.data.status, 'unavailable', 'Status should be unavailable');
  });

  await runner.run('C5: Update product quantity to positive sets status available', async () => {
    const response = await api.put(`/products/${createdProductId}`, {
      quantity: 50
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 200, 'Should update product');
    assert.equal(response.data.quantity, 50, 'Quantity should be 50');
    assert.equal(response.data.status, 'available', 'Status should be available');
  });

  // =====================================================
  // ORDERS
  // =====================================================

  await runner.run('C6: Create order with single item', async () => {
    const response = await api.post('/orders', {
      items: [{
        productId: createdProductId,
        quantity: 5,
        unitPrice: 175.00
      }],
      totalAmount: 875.00
    }, { token: customerAuth.token });
    
    assert.equal(response.status, 201, 'Should create order');
    assert.exists(response.data.id, 'Should have order ID');
    assert.equal(response.data.status, 'pending', 'Status should be pending');
    assert.equal(response.data.items.length, 1, 'Should have 1 item');
    
    createdOrderId = response.data.id;
  });

  await runner.run('C7: Order creation reduces product stock', async () => {
    const response = await api.get(`/products/${createdProductId}`);
    
    assert.equal(response.status, 200, 'Should get product');
    // 50 - 5 = 45
    assert.equal(response.data.quantity, 45, 'Quantity should be reduced to 45');
  });

  await runner.run('C8: Cannot order more than available stock', async () => {
    const response = await api.post('/orders', {
      items: [{
        productId: createdProductId,
        quantity: 1000, // More than available
        unitPrice: 175.00
      }],
      totalAmount: 175000.00
    }, { token: customerAuth.token });
    
    assert.equal(response.status, 400, 'Should reject with 400');
    assert.true(response.data.error.includes('Insufficient'), 'Error should mention insufficient stock');
  });

  await runner.run('C9: Get order by ID includes items', async () => {
    const response = await api.get(`/orders/${createdOrderId}`, { token: adminAuth.token });
    
    assert.equal(response.status, 200, 'Should get order');
    assert.exists(response.data.items, 'Should have items');
    assert.equal(response.data.items.length, 1, 'Should have 1 item');
  });

  await runner.run('C10: Approve order', async () => {
    const response = await api.put(`/orders/${createdOrderId}/approve`, {}, {
      token: adminAuth.token
    });
    
    assert.equal(response.status, 200, 'Should approve order');
    assert.equal(response.data.status, 'approved', 'Status should be approved');
    assert.exists(response.data.approvedAt, 'Should have approvedAt timestamp');
  });

  // Create another order for rejection test
  let orderToRejectId = null;
  await runner.run('C11: Create order for rejection test', async () => {
    const response = await api.post('/orders', {
      items: [{
        productId: createdProductId,
        quantity: 5,
        unitPrice: 175.00
      }],
      totalAmount: 875.00
    }, { token: customerAuth.token });
    
    assert.equal(response.status, 201, 'Should create order');
    orderToRejectId = response.data.id;
  });

  await runner.run('C12: Reject order restores stock', async () => {
    // Get stock before rejection
    const beforeResponse = await api.get(`/products/${createdProductId}`);
    const stockBefore = beforeResponse.data.quantity;
    
    // Reject order
    const rejectResponse = await api.put(`/orders/${orderToRejectId}/reject`, {
      reason: 'Test rejection'
    }, { token: adminAuth.token });
    
    assert.equal(rejectResponse.status, 200, 'Should reject order');
    assert.equal(rejectResponse.data.status, 'rejected', 'Status should be rejected');
    
    // Check stock after - should be restored
    const afterResponse = await api.get(`/products/${createdProductId}`);
    const stockAfter = afterResponse.data.quantity;
    
    // Stock should increase by 5 (the rejected quantity)
    assert.equal(stockAfter, stockBefore + 5, 'Stock should be restored');
  });

  await runner.run('C13: Create order with multiple items', async () => {
    // First create a second product
    const product2Response = await api.post('/products', {
      name: testName('FlowProduct2'),
      price: 50.00,
      quantity: 20,
      category: 'Test'
    }, { token: adminAuth.token });
    
    assert.equal(product2Response.status, 201, 'Should create second product');
    const product2Id = product2Response.data.id;
    
    // Create order with multiple items
    const orderResponse = await api.post('/orders', {
      items: [
        { productId: createdProductId, quantity: 2, unitPrice: 175.00 },
        { productId: product2Id, quantity: 3, unitPrice: 50.00 }
      ],
      totalAmount: 500.00
    }, { token: customerAuth.token });
    
    assert.equal(orderResponse.status, 201, 'Should create order');
    assert.equal(orderResponse.data.items.length, 2, 'Should have 2 items');
  });

  // =====================================================
  // USERS
  // =====================================================

  await runner.run('C14: Create user', async () => {
    const username = testName('FlowUser');
    const response = await api.post('/users', {
      username: username,
      email: `${username}@test.com`,
      password: 'testpass123',
      role: 'customer'
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 201, 'Should create user');
    assert.exists(response.data.id, 'Should have user ID');
    assert.equal(response.data.username, username, 'Username should match');
    assert.equal(response.data.role, 'customer', 'Role should be customer');
    
    createdUserId = response.data.id;
  });

  await runner.run('C15: Update user role', async () => {
    const response = await api.put(`/users/${createdUserId}`, {
      role: 'staff'
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 200, 'Should update user');
    assert.equal(response.data.role, 'staff', 'Role should be updated');
  });

  await runner.run('C16: Update user email', async () => {
    const newEmail = `${testName('updated')}@test.com`;
    const response = await api.put(`/users/${createdUserId}`, {
      email: newEmail
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 200, 'Should update user');
    assert.equal(response.data.email, newEmail, 'Email should be updated');
  });

  await runner.run('C17: Get user by ID', async () => {
    const response = await api.get(`/users/${createdUserId}`, { token: adminAuth.token });
    
    assert.equal(response.status, 200, 'Should get user');
    assert.equal(response.data.id, createdUserId, 'ID should match');
  });

  await runner.run('C18: Delete user', async () => {
    const response = await api.delete(`/users/${createdUserId}`, { token: adminAuth.token });
    
    assert.equal(response.status, 200, 'Should delete user');
    
    // Verify user is deleted
    const getResponse = await api.get(`/users/${createdUserId}`);
    assert.equal(getResponse.status, 404, 'User should not be found');
  });

  // =====================================================
  // CLEANUP - Delete test product
  // =====================================================
  
  await runner.run('C19: Delete product', async () => {
    const response = await api.delete(`/products/${createdProductId}`, {
      token: adminAuth.token
    });
    
    assert.equal(response.status, 200, 'Should delete product');
  });

  await runner.run('C20: Deleted product returns 404', async () => {
    const response = await api.get(`/products/${createdProductId}`);
    assert.equal(response.status, 404, 'Should return 404');
  });

  return runner.getResults();
}

module.exports = { runBusinessFlowTests };

// Run directly if executed as main
if (require.main === module) {
  runBusinessFlowTests()
    .then(results => {
      console.log('\n' + '='.repeat(50));
      results.passed === results.tests.length - results.skipped
        ? console.log('✅ All business flow tests passed!')
        : console.log(`❌ ${results.failed} test(s) failed`);
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}
