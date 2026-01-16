/**
 * Rate Limiter Configuration
 * 
 * Protects against:
 * - Brute force attacks
 * - DoS attacks
 * - API abuse
 */

const rateLimit = require('express-rate-limit');

/**
 * Login rate limiter - strict limits for auth endpoints
 * 5 attempts per 15 minutes per IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { 
    error: 'Too many login attempts. Please try again in 15 minutes.',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

/**
 * General API rate limiter - protects all endpoints
 * 100 requests per minute per IP
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { 
    error: 'Too many requests. Please slow down.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Strict limiter for sensitive operations
 * 10 requests per minute (user creation, password changes)
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { 
    error: 'Rate limit exceeded for this operation.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginLimiter,
  apiLimiter,
  strictLimiter
};
