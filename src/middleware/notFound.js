const AppError = require('../utils/errors/appError');
const { ErrorCodes } = require('../utils/errors/errorCodes');

/**
 * 404 Route Not Found Middleware
 */
const notFound = (req, res, next) => {
  const message = `Cannot find ${req.method} ${req.originalUrl} on this server.`;
  next(new AppError(message, 404, ErrorCodes.NOT_FOUND, 'RouteHandler.404'));
};

module.exports = notFound;
