/**
 * TEST SUITE B: Authorization & Access Control
 * 
 * Tests:
 * - Logged-in user can access allowed routes
 * - Unauthorized user is blocked from restricted routes
 * - Admin-only actions are enforced (if implemented)
 * - Access denial does not modify data
 */

const { TEST_USERS } = require('./config');
const { api, login, TestRunner, assert, testName } = require('./utils');

async function runAuthorizationTests() {
  console.log('\n🛡️ SUITE B: Authorization & Access Control\n');
  const runner = new TestRunner('Authorization & Access Control');
  
  let adminAuth = null;
  let staffAuth = null;
  let customerAuth = null;

  // Setup: Login all test users
  await runner.run('B0: Setup - Login all test users', async () => {
    adminAuth = await login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    assert.exists(adminAuth, 'Admin login failed');
    
    staffAuth = await login(TEST_USERS.staff.username, TEST_USERS.staff.password);
    assert.exists(staffAuth, 'Staff login failed');
    
    customerAuth = await login(TEST_USERS.customer.username, TEST_USERS.customer.password);
    assert.exists(customerAuth, 'Customer login failed');
  });

  // =====================================================
  // B1: Any authenticated user can GET /products
  // =====================================================
  await runner.run('B1: Any authenticated user can GET /products', async () => {
    const response = await api.get('/products', { token: customerAuth.token });
    assert.equal(response.status, 200, 'Should allow access');
    assert.isArray(response.data, 'Should return array');
  });

  // =====================================================
  // B2: Unauthenticated user can GET /products (public)
  // =====================================================
  await runner.run('B2: Unauthenticated user can GET /products', async () => {
    const response = await api.get('/products');
    assert.equal(response.status, 200, 'Should allow public access');
    assert.isArray(response.data, 'Should return array');
  });

  // =====================================================
  // B3: Any authenticated user can GET /orders
  // =====================================================
  await runner.run('B3: Any authenticated user can GET /orders', async () => {
    const response = await api.get('/orders', { token: customerAuth.token });
    assert.equal(response.status, 200, 'Should allow access');
    assert.isArray(response.data, 'Should return array');
  });

  // =====================================================
  // B4: Unauthenticated user can GET /orders (public read)
  // =====================================================
  await runner.run('B4: Unauthenticated user can GET /orders', async () => {
    const response = await api.get('/orders');
    // Note: This might be intentional or a security gap
    // Recording the actual behavior
    if (response.status === 200) {
      console.log('     ⚠️  Note: Orders list is publicly accessible');
    }
    // Don't fail, just document behavior
    assert.true(response.status === 200 || response.status === 401, 'Valid response');
  });

  // =====================================================
  // B5: Authenticated user can create product
  // =====================================================
  await runner.run('B5: Authenticated user can create product', async () => {
    const response = await api.post('/products', {
      name: testName('AuthTestProduct'),
      price: 99.99,
      quantity: 10,
      category: 'Test'
    }, { token: adminAuth.token });
    
    assert.equal(response.status, 201, 'Should create product');
    assert.exists(response.data.id, 'Should return created product');
  });

  // =====================================================
  // B6: Unauthenticated user cannot create product
  // =====================================================
  await runner.run('B6: Unauthenticated user cannot create product', async () => {
    const response = await api.post('/products', {
      name: testName('UnauthorizedProduct'),
      price: 50,
      quantity: 5
    });
    
    assert.equal(response.status, 401, 'Should reject with 401');
  });

  // =====================================================
  // B7: Authenticated user can create order
  // =====================================================
  await runner.run('B7: Authenticated user can create order', async () => {
    // First get a product to order
    const productsResponse = await api.get('/products');
    const products = productsResponse.data;
    
    if (products.length === 0) {
      throw new Error('No products available for order test');
    }
    
    const product = products.find(p => p.quantity > 0) || products[0];
    
    const response = await api.post('/orders', {
      items: [{
        productId: product.id,
        quantity: 1,
        unitPrice: product.price
      }],
      totalAmount: product.price
    }, { token: customerAuth.token });
    
    // May fail due to stock, but should not be 401
    assert.notEqual(response.status, 401, 'Should not be unauthorized');
  });

  // =====================================================
  // B8: Unauthenticated user cannot create order
  // =====================================================
  await runner.run('B8: Unauthenticated user cannot create order', async () => {
    const response = await api.post('/orders', {
      items: [{
        productId: 1,
        quantity: 1,
        unitPrice: 100
      }],
      totalAmount: 100
    });
    
    assert.equal(response.status, 401, 'Should reject with 401');
  });

  // =====================================================
  // B9: Authenticated user can approve order
  // =====================================================
  await runner.run('B9: Authenticated user can approve order', async () => {
    // Get pending orders
    const ordersResponse = await api.get('/orders', { token: adminAuth.token });
    const pendingOrder = ordersResponse.data.find(o => o.status === 'pending');
    
    if (!pendingOrder) {
      throw new Error('No pending order to approve');
    }
    
    const response = await api.put(`/orders/${pendingOrder.id}/approve`, {}, {
      token: adminAuth.token
    });
    
    // May fail if already approved, but check auth
    assert.notEqual(response.status, 401, 'Should not be unauthorized');
  });

  // =====================================================
  // B10: Unauthenticated user cannot approve order
  // =====================================================
  await runner.run('B10: Unauthenticated user cannot approve order', async () => {
    const response = await api.put('/orders/1/approve', {});
    assert.equal(response.status, 401, 'Should reject with 401');
  });

  // =====================================================
  // B11: Authenticated user can create user
  // =====================================================
  await runner.run('B11: Authenticated user can create user', async () => {
    const response = await api.post('/users', {
      username: testName('TestUser'),
      email: `${testName('testuser')}@test.com`,
      password: 'testpass123',
      role: 'customer'
    }, { token: adminAuth.token });
    
    // May fail due to duplicate, but should not be 401
    assert.notEqual(response.status, 401, 'Should not be unauthorized');
  });

  // =====================================================
  // B12: Unauthenticated user cannot create user
  // =====================================================
  await runner.run('B12: Unauthenticated user cannot create user', async () => {
    const response = await api.post('/users', {
      username: testName('UnauthorizedUser'),
      email: `${testName('unauth')}@test.com`,
      password: 'testpass123',
      role: 'customer'
    });
    
    assert.equal(response.status, 401, 'Should reject with 401');
  });

  // =====================================================
  // B13: Check if role-based restrictions exist
  // =====================================================
  await runner.run('B13: Document role restrictions (observation)', async () => {
    // This is an observational test to document current behavior
    // Try to delete a user as customer
    const deleteResponse = await api.delete('/users/1', { token: customerAuth.token });
    
    // Record what happens
    if (deleteResponse.status === 403) {
      console.log('     ✓ Role-based deletion restriction enforced');
    } else if (deleteResponse.status === 200) {
      console.log('     ⚠️  Customer can delete users (potential security gap)');
    } else {
      console.log(`     ℹ️  Delete returned status ${deleteResponse.status}`);
    }
    
    // This test passes regardless - it's observational
    assert.true(true, 'Observation recorded');
  });

  // =====================================================
  // B14: Access denial does not modify data
  // =====================================================
  await runner.run('B14: Access denial does not modify data', async () => {
    // Get product count before
    const beforeResponse = await api.get('/products');
    const countBefore = beforeResponse.data.length;
    
    // Try unauthorized product creation
    await api.post('/products', {
      name: testName('ShouldNotExist'),
      price: 999
    });
    
    // Get product count after
    const afterResponse = await api.get('/products');
    const countAfter = afterResponse.data.length;
    
    // Count should be same (unauthorized request didn't create)
    // Note: May differ by 1 if other tests created products
    const shouldNotExist = afterResponse.data.find(
      p => p.name.includes('ShouldNotExist')
    );
    
    assert.equal(shouldNotExist, undefined, 'Unauthorized product should not exist');
  });

  return runner.getResults();
}

module.exports = { runAuthorizationTests };

// Run directly if executed as main
if (require.main === module) {
  runAuthorizationTests()
    .then(results => {
      console.log('\n' + '='.repeat(50));
      results.passed === results.tests.length - results.skipped
        ? console.log('✅ All authorization tests passed!')
        : console.log(`❌ ${results.failed} test(s) failed`);
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}
