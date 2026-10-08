const Joi = require('joi');

const imageItemSchema = Joi.object().keys({
  url: Joi.string().required(),
  publicId: Joi.string().allow('').optional(),
  role: Joi.string().valid('main', 'hover', 'pyramid', 'packaging').optional(),
  alt: Joi.string().allow('').optional()
});

const singleImageInputSchema = Joi.alternatives().try(
  Joi.string().allow(''),
  Joi.object().keys({
    url: Joi.string().allow(''),
    publicId: Joi.string().allow('').optional(),
    alt: Joi.string().allow('').optional()
  })
);

const variantInputSchema = Joi.object().keys({
  _id: Joi.string().optional(),
  size: Joi.string().valid('30ml', '50ml', '100ml').required(),
  price: Joi.number().min(0).required(),
  sellingPrice: Joi.number().min(0).optional(),
  compareAtPrice: Joi.number().min(0).allow(null, '').optional(),
  oldPrice: Joi.number().min(0).allow(null, '').optional(),
  stock: Joi.number().integer().min(0).optional(),
  costPrice: Joi.number().min(0).optional(),
  targetWeightGrams: Joi.number().optional(),
  SKU: Joi.string().allow('').optional(),
  packagingCosts: Joi.object().optional(),
  images: Joi.array().items(imageItemSchema).optional()
});

const createProductSchema = {
  body: Joi.object().keys({
    name: Joi.string().required().trim(),
    slug: Joi.string().allow('').optional().trim(),
    shortDescription: Joi.string().allow('').optional(),
    description: Joi.string().allow('').optional(),
    gender: Joi.string().valid('MEN', 'WOMEN', 'Men', 'Women', 'men', 'women').optional(),
    fragranceFamily: Joi.string().allow('').optional(),
    season: Joi.array().items(Joi.string()).optional(),
    notes: Joi.object()
      .keys({
        top: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string().allow('')).optional(),
        heart: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string().allow('')).optional(),
        base: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string().allow('')).optional()
      })
      .optional(),
    mainImage: singleImageInputSchema.optional(),
    hoverImage: singleImageInputSchema.optional(),
    pyramidImage: singleImageInputSchema.optional(),
    packagingImage: singleImageInputSchema.optional(),
    images: Joi.array().items(imageItemSchema).optional(),
    variants: Joi.array().items(variantInputSchema).optional(),
    currentFormula: Joi.string().allow(null, '').optional(),
    featured: Joi.boolean().optional(),
    active: Joi.boolean().optional()
  })
};

const updateProductSchema = {
  body: Joi.object().keys({
    name: Joi.string().optional().trim(),
    slug: Joi.string().allow('').optional().trim(),
    shortDescription: Joi.string().allow('').optional(),
    description: Joi.string().allow('').optional(),
    gender: Joi.string().valid('MEN', 'WOMEN', 'Men', 'Women', 'men', 'women').optional(),
    fragranceFamily: Joi.string().allow('').optional(),
    season: Joi.array().items(Joi.string()).optional(),
    notes: Joi.object()
      .keys({
        top: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string().allow('')).optional(),
        heart: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string().allow('')).optional(),
        base: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string().allow('')).optional()
      })
      .optional(),
    mainImage: singleImageInputSchema.optional(),
    hoverImage: singleImageInputSchema.optional(),
    pyramidImage: singleImageInputSchema.optional(),
    packagingImage: singleImageInputSchema.optional(),
    images: Joi.array().items(imageItemSchema).optional(),
    variants: Joi.array().items(variantInputSchema).optional(),
    currentFormula: Joi.string().allow(null, '').optional(),
    featured: Joi.boolean().optional(),
    active: Joi.boolean().optional()
  })
};

module.exports = {
  createProductSchema,
  updateProductSchema
};
