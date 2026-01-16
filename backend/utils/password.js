/**
 * Password Utility - Secure Password Hashing with bcrypt
 * 
 * SECURITY FEATURES:
 * - Bcrypt hashing with configurable salt rounds
 * - Automatic salt generation
 * - Timing-safe password comparison
 */

const bcrypt = require('bcrypt');

// Salt rounds - higher = more secure but slower
// 10-12 is recommended for production
const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare plaintext password with hashed password
 * @param {string} password - Plaintext password to verify
 * @param {string} hashedPassword - Stored hashed password
 * @returns {Promise<boolean>} - True if passwords match
 */
async function verifyPassword(password, hashedPassword) {
  if (!password || !hashedPassword) {
    return false;
  }
  
  // Handle legacy plaintext passwords during migration
  // Remove this after all passwords are migrated to bcrypt
  if (!hashedPassword.startsWith('$2')) {
    console.warn('[Security] Legacy plaintext password detected - consider migration');
    return password === hashedPassword;
  }
  
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Check if a password is already hashed (bcrypt format)
 * @param {string} password - Password string to check
 * @returns {boolean} - True if already hashed
 */
function isHashed(password) {
  return password && password.startsWith('$2');
}

module.exports = {
  hashPassword,
  verifyPassword,
  isHashed,
  SALT_ROUNDS
};
