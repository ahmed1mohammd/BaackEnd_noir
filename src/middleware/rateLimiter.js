const rateLimit = require('express-rate-limit');
const AppError = require('../utils/errors/appError');
const { ErrorCodes } = require('../utils/errors/errorCodes');

/**
 * General API Rate Limiter (100 requests per 15 mins)
 */
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
  handler: (req, res, next) => {
    next(new AppError('Too many requests from this IP, please try again after 15 minutes.', 429, ErrorCodes.INTERNAL_ERROR, 'RateLimiter.Global'));
  }
});

/**
 * Auth Rate Limiter (10 attempts per 15 mins in production)
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
  handler: (req, res, next) => {
    next(new AppError('Too many authentication attempts, please try again after 15 minutes.', 429, ErrorCodes.AUTH_FORBIDDEN, 'RateLimiter.Auth'));
  }
});

module.exports = {
  globalRateLimiter,
  authRateLimiter
};
