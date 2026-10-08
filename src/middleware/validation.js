const AppError = require('../utils/errors/appError');
const { ErrorCodes } = require('../utils/errors/errorCodes');

/**
 * Validates request schema using Joi
 * @param {Object} schema - Joi schema object with body, query, params
 * @param {String} location - Location tag for error reporting
 */
const validate = (schema, location = 'ValidationMiddleware') => {
  return (req, res, next) => {
    const validationTargets = ['params', 'query', 'body'];

    for (const target of validationTargets) {
      if (schema[target]) {
        const { error, value } = schema[target].validate(req[target], {
          abortEarly: false,
          stripUnknown: true
        });

        if (error) {
          const errorMessage = error.details.map((detail) => detail.message).join('. ');
          return next(new AppError(errorMessage, 400, ErrorCodes.VALIDATION_ERROR, `${location}.${target}`));
        }

        req[target] = value;
      }
    }

    next();
  };
};

module.exports = validate;
