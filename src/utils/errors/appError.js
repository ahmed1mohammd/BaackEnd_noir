/**
 * Custom Operational Application Error Class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', location = 'Unknown') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.location = location;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
