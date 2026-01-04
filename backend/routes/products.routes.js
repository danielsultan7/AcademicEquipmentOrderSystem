const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const { logAuditAction, AUDIT_ACTIONS } = require('../utils/auditLogger');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// GET /api/products - Get all products
router.get('/', async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);

  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  if (error) {
    console.error('[GET /products] Error:', error.message, error.code);
    return res.status(500).json({ error: error.message });
  }

  console.log(`[GET /products] Returning ${products.length} products`);
  res.json(products);
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl} - id: ${req.params.id}`);

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', parseInt(req.params.id))
    .single();

  if (error) {
    console.error('[GET /products/:id] Error:', error.message, error.code);
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(500).json({ error: error.message });
  }

  console.log('[GET /products/:id] Found product:', product.id, product.name);
  res.json(product);
});

// POST /api/products - Create new product (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  console.log('[POST /products] Body received:', req.body);

  // Validate required fields
  if (!req.body.name) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  const quantity = parseInt(req.body.quantity) || 0;

  const newProduct = {
    name: req.body.name,
    description: req.body.description || '',
    price: parseFloat(req.body.price) || 0,
    quantity: quantity,
    category: req.body.category || 'Uncategorized',
    status: quantity > 0 ? 'available' : 'unavailable'
  };

  console.log('[POST /products] Inserting:', newProduct);

  const { data: createdProduct, error } = await supabase
    .from('products')
    .insert(newProduct)
    .select('*')
    .single();

  if (error) {
    console.error('[POST /products] Supabase error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });

    // Handle duplicate name if there's a unique constraint
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Product already exists' });
    }

    return res.status(500).json({ 
      error: 'Failed to create product', 
      message: error.message 
    });
  }

  console.log('[POST /products] Created product:', createdProduct);

  // Audit: Log product creation
  await logAuditAction({
    userId: req.user.id,
    actionType: AUDIT_ACTIONS.CREATE_PRODUCT,
    description: `Created product: ${createdProduct.name}`,
    metadata: {
      product_id: createdProduct.id,
      name: createdProduct.name,
      initial_quantity: createdProduct.quantity,
      price: createdProduct.price
    }
  });

  res.status(201).json(createdProduct);
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  console.log('[PUT /products/:id] Body received:', req.body);

  const productId = parseInt(req.params.id);

  // Check if product exists
  const { data: existingProduct, error: findError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (findError) {
    console.error('[PUT /products/:id] Find error:', findError.message, findError.code);
    if (findError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(500).json({ error: findError.message });
  }

  // Build update object with only provided fields
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.price !== undefined) updates.price = parseFloat(req.body.price);
  if (req.body.category !== undefined) updates.category = req.body.category;

  // Handle quantity and auto-update status
  const quantity = req.body.quantity !== undefined 
    ? parseInt(req.body.quantity) 
    : existingProduct.quantity;
  
  updates.quantity = quantity;
  updates.status = quantity > 0 ? 'available' : 'unavailable';

  console.log('[PUT /products/:id] Updates to apply:', updates);

  const { data: updatedProduct, error: updateError } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[PUT /products/:id] Update error:', {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint
    });
    return res.status(500).json({ 
      error: 'Failed to update product', 
      message: updateError.message 
    });
  }

  console.log('[PUT /products/:id] Updated product:', updatedProduct);

  // Audit: Log product update with field changes
  const fieldsChanged = Object.keys(updates);
  const oldValues = {};
  const newValues = {};
  fieldsChanged.forEach(field => {
    oldValues[field] = existingProduct[field];
    newValues[field] = updatedProduct[field];
  });

  await logAuditAction({
    userId: req.user.id,
    actionType: AUDIT_ACTIONS.UPDATE_PRODUCT,
    description: `Updated product: ${existingProduct.name}`,
    metadata: {
      product_id: productId,
      fields_changed: fieldsChanged,
      old_values: oldValues,
      new_values: newValues
    }
  });

  res.json(updatedProduct);
});

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  console.log(`[${req.method}] ${req.originalUrl}`);

  const productId = parseInt(req.params.id);

  // First get the product to return it after deletion
  const { data: productToDelete, error: findError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (findError) {
    console.error('[DELETE /products/:id] Find error:', findError.message, findError.code);
    if (findError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(500).json({ error: findError.message });
  }

  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (deleteError) {
    console.error('[DELETE /products/:id] Delete error:', deleteError.message);
    return res.status(500).json({ error: deleteError.message });
  }

  console.log('[DELETE /products/:id] Deleted product:', productToDelete.id, productToDelete.name);

  // Audit: Log product deletion
  await logAuditAction({
    userId: req.user.id,
    actionType: AUDIT_ACTIONS.DELETE_PRODUCT,
    description: `Deleted product: ${productToDelete.name}`,
    metadata: {
      product_id: productToDelete.id,
      name: productToDelete.name
    }
  });

  res.json(productToDelete);
});

module.exports = router;
