const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const { logAuditAction, AUDIT_ACTIONS, SYSTEM_USER_ID, getClientIp } = require('../utils/auditLogger');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth.middleware');
const { verifyPassword } = require('../utils/password');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validateLogin } = require('../middleware/validators');

// POST /api/auth/login - Authenticate user
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  
  const { username, password } = req.body;

  // Validate required fields
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  console.log('[POST /auth/login] Attempting login for:', username);

  // Query database for user by username
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, email, role, password_hash')
    .eq('username', username)
    .single();

  // Handle database errors
  if (error) {
    // PGRST116 = no rows found (user doesn't exist)
    if (error.code === 'PGRST116') {
      console.log('[POST /auth/login] User not found:', username);
      
      // Audit: Log failed login attempt (user not found)
      await logAuditAction({
        userId: SYSTEM_USER_ID,
        actionType: AUDIT_ACTIONS.LOGIN,
        description: `Failed login attempt for username: ${username}`,
        metadata: {
          status: 'failed',
          reason: 'user_not_found',
          attempted_username: username,
          ip: getClientIp(req)
        }
      });
      
      // Use generic message to prevent username enumeration
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    // Other database errors
    console.error('[POST /auth/login] Database error:', error.message);
    return res.status(500).json({ error: 'Login failed' });
  }

  // Secure password verification using bcrypt
  // Also supports legacy plaintext passwords during migration
  const storedPassword = user.password_hash || '';
  const isPasswordValid = await verifyPassword(password, storedPassword);

  if (!isPasswordValid) {
    console.log('[POST /auth/login] Invalid password for:', username);
    
    // Audit: Log failed login attempt (wrong password)
    await logAuditAction({
      userId: SYSTEM_USER_ID,
      actionType: AUDIT_ACTIONS.LOGIN,
      description: `Failed login attempt for username: ${username}`,
      metadata: {
        status: 'failed',
        reason: 'wrong_password',
        attempted_username: username,
        ip: getClientIp(req)
      }
    });
    
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // TODO: [SECURITY] Generate JWT token here in future
  // Future upgrade: const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

  // Return user data without password_hash
  const safeUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  // Generate JWT token
  const token = generateToken(user);

  console.log('[POST /auth/login] Login successful for:', username);

  // Audit: Log successful login
  await logAuditAction({
    userId: user.id,
    actionType: AUDIT_ACTIONS.LOGIN,
    description: `User ${username} logged in successfully`,
    metadata: {
      status: 'success',
      reason: null,
      ip: getClientIp(req)
    }
  });
  
  res.json({
    message: 'Login successful',
    user: safeUser,
    token: token
  });
});

// POST /api/auth/logout - Log out user (requires authentication)
// IMPORTANT: This must be called BEFORE clearing the token on client side
router.post('/logout', authenticate, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  
  const { reason = 'manual' } = req.body;
  
  // Validate reason
  const validReasons = ['manual', 'token_expired', 'forced'];
  const logoutReason = validReasons.includes(reason) ? reason : 'manual';
  
  console.log(`[POST /auth/logout] User ${req.user.username} logging out (reason: ${logoutReason})`);
  
  // Audit: Log the logout BEFORE invalidating session
  await logAuditAction({
    userId: req.user.id,
    actionType: AUDIT_ACTIONS.LOGOUT,
    description: `User ${req.user.username} logged out`,
    metadata: {
      reason: logoutReason,
      ip: getClientIp(req)
    }
  });
  
  res.json({ message: 'Logout successful' });
});

module.exports = router;
