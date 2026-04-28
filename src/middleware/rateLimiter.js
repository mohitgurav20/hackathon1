const rateLimit = require('express-rate-limit');

/**
 * General rate limiter — 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Vote rate limiter — 5 vote attempts per minute per IP
 * Prevents brute-force voting attacks
 */
const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many vote attempts. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { generalLimiter, voteLimiter };
