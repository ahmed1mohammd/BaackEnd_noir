const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    role: { 
      type: String, 
      enum: ['main', 'hover', 'pyramid', 'packaging'], 
      default: 'main' 
    },
    alt: { type: String, default: '' }
  },
  { _id: false }
);

const singleImageObjectSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    alt: { type: String, default: '' }
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: [true, 'Variant size is required (e.g. 30ml, 50ml, 100ml)'],
      enum: ['30ml', '50ml', '100ml'],
      trim: true
    },
    // Selling Price / Current Price
    price: {
      type: Number,
      required: [true, 'Variant selling price is required'],
      min: [0, 'Price cannot be negative']
    },
    // Compare-at Price / Old Price (displayed crossed-out)
    compareAtPrice: {
      type: Number,
      default: null,
      min: [0, 'Compare-at price cannot be negative']
    },
    oldPrice: {
      type: Number,
      default: null,
      min: [0, 'Old price cannot be negative']
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, 'Cost price cannot be negative']
    },
    targetWeightGrams: {
      type: Number,
      default: 50,
      min: [1, 'Target weight must be at least 1 gram']
    },
    packagingCosts: {
      bottle: { type: Number, default: 0 },
      sticker: { type: Number, default: 0 },
      box: { type: Number, default: 0 },
      bag: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    stock: {
      type: Number,
      default: 999,
      min: [0, 'Stock cannot be negative']
    },
    SKU: {
      type: String,
      trim: true,
      uppercase: true
    },
    images: [imageSchema]
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    shortDescription: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    fragranceFamily: {
      type: String,
      trim: true,
      default: 'Signature'
    },
    gender: {
      type: String,
      enum: ['MEN', 'WOMEN', 'Men', 'Women'],
      default: 'MEN',
      index: true
    },
    notes: {
      top: [{ type: String, trim: true }],
      heart: [{ type: String, trim: true }],
      base: [{ type: String, trim: true }]
    },
    // Explicit Role-Based Images
    mainImage: singleImageObjectSchema,
    hoverImage: singleImageObjectSchema,
    pyramidImage: singleImageObjectSchema,
    packagingImage: singleImageObjectSchema,
    // Array of all images with explicit role metadata for compatibility
    images: [imageSchema],
    variants: {
      type: [variantSchema],
      validate: [
        function (val) {
          return val && val.length > 0;
        },
        'Product must have variants.'
      ]
    },
    currentFormula: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Formula',
      default: null
    },
    featured: {
      type: Boolean,
      default: false,
      index: true
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Pre-save hook to normalize gender and synchronize image roles & variant oldPrice/compareAtPrice
productSchema.pre('save', function (next) {
  // 1. Normalize Gender to uppercase MEN / WOMEN
  if (this.gender) {
    const upper = this.gender.toUpperCase();
    this.gender = upper === 'WOMEN' ? 'WOMEN' : 'MEN';
  }

  // 2. Synchronize images array and direct role properties
  const roleMap = {
    main: this.mainImage?.url ? this.mainImage : null,
    hover: this.hoverImage?.url ? this.hoverImage : null,
    pyramid: this.pyramidImage?.url ? this.pyramidImage : null,
    packaging: this.packagingImage?.url ? this.packagingImage : null,
  };

  // If images array was provided or updated, populate role fields if empty
  if (Array.isArray(this.images) && this.images.length > 0) {
    this.images.forEach((img) => {
      if (img.role && !roleMap[img.role]) {
        roleMap[img.role] = { url: img.url, publicId: img.publicId || '', alt: img.alt || '' };
      }
    });
  }

  // Set direct properties
  if (roleMap.main?.url) this.mainImage = { url: roleMap.main.url, publicId: roleMap.main.publicId || '', alt: roleMap.main.alt || '' };
  if (roleMap.hover?.url) this.hoverImage = { url: roleMap.hover.url, publicId: roleMap.hover.publicId || '', alt: roleMap.hover.alt || '' };
  if (roleMap.pyramid?.url) this.pyramidImage = { url: roleMap.pyramid.url, publicId: roleMap.pyramid.publicId || '', alt: roleMap.pyramid.alt || '' };
  if (roleMap.packaging?.url) this.packagingImage = { url: roleMap.packaging.url, publicId: roleMap.packaging.publicId || '', alt: roleMap.packaging.alt || '' };

  // Re-build consolidated images array with explicit roles
  const consolidatedImages = [];
  if (this.mainImage?.url) consolidatedImages.push({ url: this.mainImage.url, publicId: this.mainImage.publicId || '', role: 'main', alt: this.mainImage.alt || `${this.name} - Main` });
  if (this.hoverImage?.url) consolidatedImages.push({ url: this.hoverImage.url, publicId: this.hoverImage.publicId || '', role: 'hover', alt: this.hoverImage.alt || `${this.name} - Hover` });
  if (this.pyramidImage?.url) consolidatedImages.push({ url: this.pyramidImage.url, publicId: this.pyramidImage.publicId || '', role: 'pyramid', alt: this.pyramidImage.alt || `${this.name} - Fragrance Pyramid` });
  if (this.packagingImage?.url) consolidatedImages.push({ url: this.packagingImage.url, publicId: this.packagingImage.publicId || '', role: 'packaging', alt: this.packagingImage.alt || `${this.name} - Packaging` });

  if (consolidatedImages.length > 0) {
    this.images = consolidatedImages;
  }

  // 3. Synchronize oldPrice and compareAtPrice across variants
  if (Array.isArray(this.variants)) {
    this.variants.forEach((v) => {
      if (v.oldPrice !== undefined && v.compareAtPrice === undefined) {
        v.compareAtPrice = v.oldPrice;
      } else if (v.compareAtPrice !== undefined && v.oldPrice === undefined) {
        v.oldPrice = v.compareAtPrice;
      }
    });
  }

  next();
});

// Search indexes
productSchema.index({ name: 'text', description: 'text', fragranceFamily: 'text', shortDescription: 'text' });
productSchema.index({ 'variants.SKU': 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
