/**
 * Cleanup Utility
 * Removes test data created during system audit tests
 * 
 * Run this after testing to clean up test artifacts
 */

const { TEST_USERS, TEST_PREFIX } = require('./config');
const { api, login } = require('./utils');

async function cleanup() {
  console.log('🧹 Starting cleanup...\n');

  // Login as admin
  const adminAuth = await login(TEST_USERS.admin.username, TEST_USERS.admin.password);
  if (!adminAuth) {
    console.log('❌ Could not login as admin for cleanup');
    return;
  }

  let deleted = { products: 0, users: 0 };

  // Clean up test products
  console.log('📦 Cleaning test products...');
  const productsResponse = await api.get('/products');
  if (productsResponse.status === 200) {
    const testProducts = productsResponse.data.filter(p => 
      p.name && p.name.includes(TEST_PREFIX)
    );
    
    for (const product of testProducts) {
      const deleteResponse = await api.delete(`/products/${product.id}`, { 
        token: adminAuth.token 
      });
      if (deleteResponse.status === 200) {
        deleted.products++;
        console.log(`   Deleted product: ${product.name}`);
      }
    }
  }

  // Clean up test users
  console.log('\n👤 Cleaning test users...');
  const usersResponse = await api.get('/users');
  if (usersResponse.status === 200) {
    const testUsers = usersResponse.data.filter(u => 
      u.username && u.username.includes(TEST_PREFIX)
    );
    
    for (const user of testUsers) {
      const deleteResponse = await api.delete(`/users/${user.id}`, { 
        token: adminAuth.token 
      });
      if (deleteResponse.status === 200) {
        deleted.users++;
        console.log(`   Deleted user: ${user.username}`);
      }
    }
  }

  console.log('\n✅ Cleanup complete');
  console.log(`   Products deleted: ${deleted.products}`);
  console.log(`   Users deleted: ${deleted.users}`);
  
  // Note: We don't delete orders or logs - they are audit trail
  console.log('\n⚠️  Note: Test orders and logs are preserved for audit trail');
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
