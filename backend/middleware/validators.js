/**
 * Input Validation Middleware
 * 
 * Centralized validation rules using express-validator
 * Protects against:
 * - SQL injection (via parameterized queries + validation)
 * - XSS attacks (via sanitization)
 * - Invalid data types
 */

const { body, param, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

/**
 * User validation rules
 */
const validateUserCreate = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'procurement_manager', 'customer']).withMessage('Invalid role'),
  handleValidationErrors
];

const validateUserUpdate = [
  param('id').isInt({ min: 1 }).withMessage('Invalid user ID'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'procurement_manager', 'customer']).withMessage('Invalid role'),
  handleValidationErrors
];

/**
 * Product validation rules
 */
const validateProductCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ max: 200 }).withMessage('Product name too long'),
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Category name too long'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description too long'),
  handleValidationErrors
];

const validateProductUpdate = [
  param('id').isInt({ min: 1 }).withMessage('Invalid product ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Product name too long'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  handleValidationErrors
];

/**
 * Order validation rules
 */
const validateOrderCreate = [
  body('items')
    .isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('items.*.product_id')
    .isInt({ min: 1 }).withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  handleValidationErrors
];

/**
 * Login validation rules
 */
const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

/**
 * ID parameter validation
 */
const validateIdParam = [
  param('id').isInt({ min: 1 }).withMessage('Invalid ID'),
  handleValidationErrors
];

module.exports = {
  validateUserCreate,
  validateUserUpdate,
  validateLogin,
  validateIdParam,
  handleValidationErrors,
  // Available but currently unused validators (kept for future use):
  // validateProductCreate,
  // validateProductUpdate,
  // validateOrderCreate
};
