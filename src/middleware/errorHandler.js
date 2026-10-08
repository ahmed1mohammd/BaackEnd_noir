const AppError = require('../utils/errors/appError');
const { ErrorCodes } = require('../utils/errors/errorCodes');
const { sendError } = require('../utils/responses/responseHandler');

/**
 * Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.statusCode = err.statusCode || 500;
  error.code = err.code || ErrorCodes.INTERNAL_ERROR;
  error.location = err.location || 'ServerHandler';

  // Log error details for server diagnostics
  console.error(`[ERROR] [${new Date().toISOString()}] Location: ${error.location} | Code: ${error.code} | Message: ${error.message}`);
  if (process.env.NODE_ENV === 'development' && err.stack) {
    console.error(err.stack);
  }

  // 1. Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, `Database.CastError[${err.path}]`);
  }

  // 2. Mongoose Duplicate Key (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate field value entered: ${field} '${val}'. Please use another value!`;
    const code = field === 'phone' ? ErrorCodes.PHONE_ALREADY_EXISTS : ErrorCodes.DUPLICATE_RESOURCE;
    error = new AppError(message, 400, code, `Database.DuplicateKey[${field}]`);
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    error = new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, 'Database.ValidationError');
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token. Please log in again.', 401, ErrorCodes.AUTH_INVALID_TOKEN, 'Auth.JWT');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Authentication token has expired. Please log in again.', 401, ErrorCodes.AUTH_EXPIRED_TOKEN, 'Auth.JWT');
  }

  // 5. JSON Syntax Error (Malformed Body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError('Malformed JSON payload in request body.', 400, ErrorCodes.VALIDATION_ERROR, 'Middleware.bodyParser');
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'An unexpected internal server error occurred.';
  const errorCode = typeof error.code === 'string' ? error.code : ErrorCodes.INTERNAL_ERROR;
  const location = error.location || 'ServerHandler';

  const debug = process.env.NODE_ENV === 'development' ? { stack: err.stack, originalError: err } : null;

  return sendError(res, statusCode, message, errorCode, location, debug);
};

module.exports = errorHandler;
