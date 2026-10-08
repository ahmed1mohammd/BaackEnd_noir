const { verifyWebhookSignature } = require('./utils');
const AppError = require('../../utils/errors/appError');
const { ErrorCodes } = require('../../utils/errors/errorCodes');

/**
 * Middleware to verify Fawaterk webhook signature
 */
const verifyFawaterkWebhook = (req, res, next) => {
  try {
    const signature = req.headers['x-fawaterk-signature'] || req.headers['signature'];

    // In production, enforce strict signature verification
    if (process.env.NODE_ENV === 'production' && !verifyWebhookSignature(signature, req.body)) {
      return next(
        new AppError(
          'Invalid Fawaterk webhook signature.',
          401,
          ErrorCodes.INVALID_WEBHOOK_SIGNATURE,
          'FawaterkMiddleware.verifyWebhook'
        )
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyFawaterkWebhook
};
