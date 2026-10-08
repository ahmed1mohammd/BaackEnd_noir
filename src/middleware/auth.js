const { verifyToken } = require('../utils/security/jwt');
const User = require('../modules/users/user.model');
const AppError = require('../utils/errors/appError');
const { ErrorCodes } = require('../utils/errors/errorCodes');

/**
 * Protect routes - require valid JWT
 */
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError(
          'Authentication required. Please provide a valid Bearer token.',
          401,
          ErrorCodes.AUTH_UNAUTHORIZED,
          'AuthMiddleware.protect'
        )
      );
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(
        new AppError(
          'The customer account associated with this token no longer exists.',
          401,
          ErrorCodes.USER_NOT_FOUND,
          'AuthMiddleware.protect'
        )
      );
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional protect - populates req.user if valid token provided, but doesn't block if absent
 */
const optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Ignore error in optional auth
    next();
  }
};

/**
 * Restrict routes to specific roles (e.g. 'admin')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action.',
          403,
          ErrorCodes.AUTH_FORBIDDEN,
          'AuthMiddleware.restrictTo'
        )
      );
    }
    next();
  };
};

module.exports = {
  protect,
  optionalProtect,
  restrictTo
};
