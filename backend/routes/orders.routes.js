const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const { logAuditAction, AUDIT_ACTIONS } = require('../utils/auditLogger');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth.middleware');

// GET /api/orders - Get all orders (optionalAuth: filter by user if customer)
router.get('/', optionalAuth, async (req, res) => {
  try {
    // 1. Fetch all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('[GET /orders] Error:', ordersError.message);
      return res.status(500).json({ error: ordersError.message });
    }

    // 2. Fetch all order items with product info
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        product_id,
        quantity,
        unit_price,
        products ( name )
      `);

    if (itemsError) {
      console.error('[GET /orders] Items error:', itemsError.message);
      return res.status(500).json({ error: itemsError.message });
    }

    // 3. Group items by order_id and transform to frontend format
    const itemsByOrderId = {};
    for (const item of orderItems) {
      if (!itemsByOrderId[item.order_id]) {
        itemsByOrderId[item.order_id] = [];
      }
      itemsByOrderId[item.order_id].push({
        productId: item.product_id,
        name: item.products?.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.unit_price
      });
    }

    // 4. Combine orders with their items, map snake_case to camelCase
    const result = orders.map(order => ({
      id: order.id,
      userId: order.user_id,
      status: order.status,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
      approvedAt: order.approved_at,
      rejectedAt: order.rejected_at,
      items: itemsByOrderId[order.id] || []
    }));

    console.log(`[GET /orders] Returning ${result.length} orders`);
    res.json(result);

  } catch (error) {
    console.error('[GET /orders] Unexpected error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Get order by ID (optionalAuth for ownership check)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    // 1. Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.status(500).json({ error: orderError.message });
    }

    // 2. Fetch order items with product names
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        unit_price,
        products ( name )
      `)
      .eq('order_id', orderId);

    if (itemsError) {
      return res.status(500).json({ error: itemsError.message });
    }

    // 3. Transform to frontend format
    const result = {
      id: order.id,
      userId: order.user_id,
      status: order.status,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
      approvedAt: order.approved_at,
      rejectedAt: order.rejected_at,
      items: items.map(item => ({
        productId: item.product_id,
        name: item.products?.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.unit_price
      }))
    };

    res.json(result);

  } catch (error) {
    console.error('[GET /orders/:id] Error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders - Create new order (requires authentication)
router.post('/', authenticate, async (req, res) => {
  try {
    const { items: orderItems = [], totalAmount = 0 } = req.body;
    const userId = req.user.id; // Get userId from authenticated user

    if (!orderItems.length) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }

    // 1. Get all products we need to validate
    const productIds = orderItems.map(item => item.productId);
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, quantity')
      .in('id', productIds);

    if (productsError) {
      return res.status(500).json({ error: productsError.message });
    }

    // 2. Validate stock availability
    for (const item of orderItems) {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }
      
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
        });
      }
    }

    // 3. Create the order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending',
        total_amount: totalAmount,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('[POST /orders] Order insert error:', orderError);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    // 4. Insert order items (frontend sends 'unitPrice')
    const orderItemsToInsert = orderItems.map(item => ({
      order_id: newOrder.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice || item.price || 0
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) {
      console.error('[POST /orders] Items insert error:', itemsError);
      // Rollback: delete the order we just created
      await supabase.from('orders').delete().eq('id', newOrder.id);
      return res.status(500).json({ error: 'Failed to create order items' });
    }

    // 5. Update product quantities
    for (const item of orderItems) {
      const product = products.find(p => p.id === item.productId);
      const newQuantity = product.quantity - item.quantity;
      
      const { error: updateError } = await supabase
        .from('products')
        .update({
          quantity: newQuantity,
          status: newQuantity === 0 ? 'unavailable' : 'available'
        })
        .eq('id', item.productId);

      if (updateError) {
        console.error('[POST /orders] Product update error:', updateError);
      }
    }

    // 6. Return created order in frontend format
    const result = {
      id: newOrder.id,
      userId: newOrder.user_id,
      status: newOrder.status,
      totalAmount: newOrder.total_amount,
      createdAt: newOrder.created_at,
      items: orderItems.map(item => ({
        productId: item.productId,
        name: products.find(p => p.id === item.productId)?.name,
        quantity: item.quantity,
        price: item.unitPrice || item.price || 0
      }))
    };

    console.log('[POST /orders] Created order:', result.id);

    // Audit: Log order creation
    await logAuditAction({
      userId: userId,
      actionType: AUDIT_ACTIONS.CREATE_ORDER,
      description: `Created order #${newOrder.id} ($${totalAmount})`,
      metadata: {
        order_id: newOrder.id,
        total_amount: totalAmount,
        items_count: orderItems.length
      }
    });

    res.status(201).json(result);

  } catch (error) {
    console.error('[POST /orders] Unexpected error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/orders/:id - Update order (requires authentication)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const updateData = {};
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.totalAmount !== undefined) updateData.total_amount = req.body.totalAmount;

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.json({
      id: order.id,
      userId: order.user_id,
      status: order.status,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
      approvedAt: order.approved_at,
      rejectedAt: order.rejected_at
    });

  } catch (error) {
    console.error('[PUT /orders/:id] Error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// PUT /api/orders/:id/approve - Approve order (admin/manager only)
router.put('/:id/approve', authenticate, requireRole('admin', 'procurement_manager'), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    // Audit: Log order approval
    await logAuditAction({
      userId: req.user.id,
      actionType: AUDIT_ACTIONS.APPROVE_ORDER,
      description: `Approved order #${orderId}`,
      metadata: {
        order_id: orderId,
        previous_status: 'pending',
        new_status: 'approved'
      }
    });

    res.json({
      id: order.id,
      userId: order.user_id,
      status: order.status,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
      approvedAt: order.approved_at,
      rejectedAt: order.rejected_at
    });

  } catch (error) {
    console.error('[PUT /orders/:id/approve] Error:', error);
    res.status(500).json({ error: 'Failed to approve order' });
  }
});

// PUT /api/orders/:id/reject - Reject order (and restore stock) (admin/manager only)
router.put('/:id/reject', authenticate, requireRole('admin', 'procurement_manager'), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    // 1. Get the order to check its status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.status(500).json({ error: orderError.message });
    }

    // 2. If order was pending, restore stock
    if (order.status === 'pending') {
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (itemsError) {
        return res.status(500).json({ error: itemsError.message });
      }

      for (const item of items) {
        const { data: product } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', item.product_id)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({
              quantity: product.quantity + item.quantity,
              status: 'available'
            })
            .eq('id', item.product_id);
        }
      }
    }

    // 3. Update order status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // Audit: Log order rejection
    await logAuditAction({
      userId: req.user.id,
      actionType: AUDIT_ACTIONS.REJECT_ORDER,
      description: `Rejected order #${orderId}`,
      metadata: {
        order_id: orderId,
        previous_status: order.status,
        new_status: 'rejected',
        reason: req.body.reason || null
      }
    });

    res.json({
      id: updatedOrder.id,
      userId: updatedOrder.user_id,
      status: updatedOrder.status,
      totalAmount: updatedOrder.total_amount,
      createdAt: updatedOrder.created_at,
      approvedAt: updatedOrder.approved_at,
      rejectedAt: updatedOrder.rejected_at
    });

  } catch (error) {
    console.error('[PUT /orders/:id/reject] Error:', error);
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

module.exports = router;
