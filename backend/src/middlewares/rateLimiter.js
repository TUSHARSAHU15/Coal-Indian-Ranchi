const rateLimit = require('express-rate-limit');

// Rate limiter for authentication endpoints (login, MFA)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for high-throughput gate scans
const gateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 scans per minute
  message: {
    success: false,
    message: 'Gate scanner rate limit exceeded. Please wait a moment.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again shortly.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  gateLimiter,
  generalLimiter
};
