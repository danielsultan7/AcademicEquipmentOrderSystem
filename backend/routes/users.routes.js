const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const { logAuditAction, AUDIT_ACTIONS } = require('../utils/auditLogger');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { hashPassword } = require('../utils/password');
const { strictLimiter } = require('../middleware/rateLimiter');
const { validateUserCreate, validateUserUpdate, validateIdParam } = require('../middleware/validators');

// Helper: mask password in logs
const sanitizeBody = (body) => {
  const sanitized = { ...body };
  if (sanitized.password) sanitized.password = '***MASKED***';
  return sanitized;
};

// GET /api/users - Get all users (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, username, email, role');

  if (error) {
    console.error('[GET /users] Error:', error.message, error.code, error.hint);
    return res.status(500).json({ error: error.message });
  }

  console.log(`[GET /users] Returning ${users.length} users`);
  res.json(users);
});

// GET /api/users/:id - Get user by ID (authenticated users)
router.get('/:id', authenticate, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl} - id: ${req.params.id}`);
  
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, email, role')
    .eq('id', parseInt(req.params.id))
    .single();

  if (error) {
    console.error('[GET /users/:id] Error:', error.message, error.code);
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: error.message });
  }

  console.log('[GET /users/:id] Found user:', user.id, user.username);
  res.json(user);
});

// POST /api/users - Create new user (admin only)
router.post('/', authenticate, requireAdmin, strictLimiter, validateUserCreate, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  console.log('[POST /users] Body received:', sanitizeBody(req.body));

  // Hash the password before storing
  const hashedPassword = await hashPassword(req.body.password);

  // Build insert object matching DB schema exactly
  const newUser = {
    username: req.body.username,
    email: req.body.email,
    password_hash: hashedPassword, // Now properly hashed
    role: req.body.role || 'customer'
  };

  console.log('[POST /users] Inserting:', { ...newUser, password_hash: '***MASKED***' });

  const { data: createdUser, error } = await supabase
    .from('users')
    .insert(newUser)
    .select('id, username, email, role')
    .single();

  if (error) {
    console.error('[POST /users] Supabase error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    
    // Handle specific database errors with user-friendly messages
    if (error.code === '23505') {
      // Unique constraint violation
      if (error.message.includes('username')) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      if (error.message.includes('email')) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      return res.status(409).json({ error: 'User already exists' });
    }
    
    return res.status(500).json({ 
      error: 'Failed to save user', 
      message: error.message,
      code: error.code,
      hint: error.hint 
    });
  }

  console.log('[POST /users] Created user:', createdUser);

  // Audit: Log user creation
  await logAuditAction({
    userId: req.user.id,
    actionType: AUDIT_ACTIONS.CREATE_USER,
    description: `Created user: ${createdUser.username} (${createdUser.role})`,
    metadata: {
      created_user_id: createdUser.id,
      username: createdUser.username,
      role: createdUser.role
    }
  });

  res.status(201).json(createdUser);
});

// PUT /api/users/:id - Update user (requires authentication)
router.put('/:id', authenticate, validateUserUpdate, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  console.log('[PUT /users/:id] Body received:', sanitizeBody(req.body));
  
  const userId = parseInt(req.params.id);
  console.log('[PUT /users/:id] Parsed userId:', userId);

  // Check if user exists
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (findError) {
    console.error('[PUT /users/:id] Find error:', findError.message, findError.code);
    if (findError.code === 'PGRST116') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: findError.message });
  }

  // Build update object with only provided fields
  const updates = {};
  if (req.body.username !== undefined) updates.username = req.body.username;
  if (req.body.email !== undefined) updates.email = req.body.email;
  if (req.body.role !== undefined) updates.role = req.body.role;
  
  // Hash password if being updated
  if (req.body.password) {
    updates.password_hash = await hashPassword(req.body.password);
  }

  console.log('[PUT /users/:id] Updates to apply:', { ...updates, password_hash: updates.password_hash ? '***MASKED***' : undefined });

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('id, username, email, role')
    .single();

  if (updateError) {
    console.error('[PUT /users/:id] Update error:', {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint
    });
    return res.status(500).json({ 
      error: 'Failed to update user',
      message: updateError.message,
      code: updateError.code,
      hint: updateError.hint
    });
  }

  console.log('[PUT /users/:id] Updated user:', updatedUser);

  // Audit: Log user update
  await logAuditAction({
    userId: req.user.id,
    actionType: AUDIT_ACTIONS.UPDATE_USER,
    description: `Updated user: ${updatedUser.username}`,
    metadata: {
      target_user_id: userId,
      fields_changed: Object.keys(updates).filter(k => k !== 'password_hash')
    }
  });

  res.json(updatedUser);
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  
  const userId = parseInt(req.params.id);

  // First get the user to return it after deletion
  const { data: userToDelete, error: findError } = await supabase
    .from('users')
    .select('id, username, email, role')
    .eq('id', userId)
    .single();

  if (findError) {
    console.error('[DELETE /users/:id] Find error:', findError.message, findError.code);
    if (findError.code === 'PGRST116') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: findError.message });
  }

  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (deleteError) {
    console.error('[DELETE /users/:id] Delete error:', deleteError.message);
    return res.status(500).json({ error: deleteError.message });
  }

  console.log('[DELETE /users/:id] Deleted user:', userToDelete.id);

  // Audit: Log user deletion
  await logAuditAction({
    userId: req.user.id,
    actionType: AUDIT_ACTIONS.DELETE_USER,
    description: `Deleted user: ${userToDelete.username}`,
    metadata: {
      deleted_user_id: userToDelete.id,
      deleted_username: userToDelete.username,
      deleted_role: userToDelete.role
    }
  });

  res.json(userToDelete);
});

module.exports = router;
