const { SuccessCodes } = require('../errors/errorCodes');

/**
 * Standard Success Response Helper
 * @param {Object} res - Express Response object
 * @param {Number} statusCode - HTTP status code (default 200)
 * @param {String} message - Readable message
 * @param {String} code - Success code string
 * @param {String} location - Component/Controller location string
 * @param {Object|Array|null} data - Payload data
 */
const sendSuccess = (
  res,
  statusCode = 200,
  message = 'Operation completed successfully',
  code = SuccessCodes.OK,
  location = 'System',
  data = null
) => {
  const response = {
    success: true,
    message,
    code,
    location
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Standard Error Response Helper (used by global errorHandler)
 */
const sendError = (
  res,
  statusCode = 500,
  message = 'An unexpected error occurred',
  code = 'INTERNAL_ERROR',
  location = 'System',
  extra = null
) => {
  const response = {
    success: false,
    message,
    code,
    location
  };

  if (extra && process.env.NODE_ENV === 'development') {
    response.debug = extra;
  }

  return res.status(statusCode).json(response);
};

const sendResponse = (res, statusCode = 200, message = 'Operation completed successfully', data = null) => {
  return sendSuccess(res, statusCode, message, SuccessCodes.OK, 'System', data);
};

module.exports = {
  sendSuccess,
  sendError,
  sendResponse
};

