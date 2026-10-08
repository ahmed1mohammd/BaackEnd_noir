const Joi = require('joi');

const registerSchema = {
  body: Joi.object().keys({
    name: Joi.string().required().trim().min(2).max(100).messages({
      'string.empty': 'Name cannot be empty',
      'any.required': 'Name is required'
    }),
    phone: Joi.string().required().trim().min(8).max(20).messages({
      'string.empty': 'Phone number cannot be empty',
      'any.required': 'Phone number is required'
    }),
    email: Joi.string().email().trim().allow('', null).optional(),
    password: Joi.string().min(4).max(100).allow('', null).optional()
  })
};

const loginSchema = {
  body: Joi.object().keys({
    phone: Joi.string().allow('', null).optional().trim(),
    email: Joi.string().allow('', null).optional().trim(),
    identifier: Joi.string().allow('', null).optional().trim(),
    password: Joi.string().allow('', null).optional()
  }).or('phone', 'email', 'identifier')
};

module.exports = {
  registerSchema,
  loginSchema
};
