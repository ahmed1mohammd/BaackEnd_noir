const Joi = require('joi');

const orderItemSchema = Joi.object().keys({
  productId: Joi.string().required(),
  variantSKU: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required()
});

const metroPickupSchema = Joi.object().keys({
  stationId: Joi.string().required(),
  stationNameEn: Joi.string().required(),
  stationNameAr: Joi.string().required(),
  line: Joi.string().allow('', null).optional(),
  pickupNote: Joi.string().allow('', null).optional(),
  fee: Joi.number().min(0).optional()
});

const shippingAddressSchema = Joi.object().keys({
  governorate: Joi.string().allow('').optional().trim(),
  city: Joi.string().allow('').optional().trim(),
  street: Joi.string().allow('').optional().trim(),
  buildingNumber: Joi.string().allow('').optional().trim(),
  floor: Joi.string().allow('').optional().trim(),
  apartment: Joi.string().allow('').optional().trim(),
  landmark: Joi.string().allow('').optional().trim(),
  deliveryNotes: Joi.string().allow('').optional().trim(),
  postalCode: Joi.string().allow('').optional(),
  country: Joi.string().default('Egypt').optional()
});

const createOrderSchema = {
  body: Joi.object().keys({
    items: Joi.array().items(orderItemSchema).min(1).required(),
    deliveryMethod: Joi.string().valid('metro_pickup', 'home_delivery').default('home_delivery'),
    metroPickup: metroPickupSchema.when('deliveryMethod', {
      is: 'metro_pickup',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null)
    }),
    shippingAddress: shippingAddressSchema.when('deliveryMethod', {
      is: 'home_delivery',
      then: Joi.object().keys({
        governorate: Joi.string().required().trim(),
        city: Joi.string().required().trim(),
        street: Joi.string().required().trim(),
        buildingNumber: Joi.string().allow('', null).optional()
      }).unknown(true).required(),
      otherwise: Joi.optional().allow(null)
    }),
    customerPhone: Joi.string().allow('', null).optional(),
    customerPhone2: Joi.string().allow('', null).optional(),
    customerEmail: Joi.string().email().allow('', null).optional(),
    customerName: Joi.string().allow('', null).optional(),
    paymentMethod: Joi.string().valid('vodafone_cash', 'instapay', 'cod', 'cash_on_delivery', 'fawaterk', 'card').optional(),
    paymentScreenshot: Joi.string().allow('', null).optional(),
    paymentProofUrl: Joi.string().allow('', null).optional(),
    paymentSenderPhone: Joi.string().allow('', null).optional(),
    paymentReference: Joi.string().allow('', null).optional(),
    couponCode: Joi.string().allow('', null).optional()
  }).unknown(true)
};

const shippingQuoteSchema = {
  body: Joi.object().keys({
    deliveryMethod: Joi.string().valid('metro_pickup', 'home_delivery').required(),
    governorate: Joi.string().allow('').optional(),
    city: Joi.string().allow('').optional(),
    subtotal: Joi.number().min(0).required()
  })
};

const updateOrderStatusSchema = {
  body: Joi.object().keys({
    orderStatus: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional()
  })
};

module.exports = {
  createOrderSchema,
  shippingQuoteSchema,
  updateOrderStatusSchema
};
