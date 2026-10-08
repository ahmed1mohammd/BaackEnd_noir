const Joi = require('joi');

const initiatePaymentSchema = {
  body: Joi.object().keys({
    orderId: Joi.string().required().messages({
      'any.required': 'orderId is required to initiate payment'
    })
  })
};

module.exports = {
  initiatePaymentSchema
};
