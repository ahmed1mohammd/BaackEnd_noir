const Product = require('./product.model');
const AppError = require('../../utils/errors/appError');
const { ErrorCodes } = require('../../utils/errors/errorCodes');

const generateSlug = (text) => {
  if (!text) return `elan-perfume-${Date.now()}`;
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritical marks
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-') // collapse dashes
    .replace(/^-+/, '') // trim - from start
    .replace(/-+$/, ''); // trim - from end
};

const REQUIRED_SIZES = ['30ml', '50ml', '100ml'];

class ProductService {
  /**
   * Helper: Normalize variants to ensure 30ml, 50ml, and 100ml are present with valid prices and SKUs
   */
  static normalizeVariants(variants = [], productSlug = 'elan-fragrance') {
    const sizeMap = {};
    if (Array.isArray(variants)) {
      variants.forEach((v) => {
        if (v && v.size) {
          const key = v.size.toLowerCase().trim();
          sizeMap[key] = v;
        }
      });
    }

    const normalized = REQUIRED_SIZES.map((size) => {
      const existing = sizeMap[size.toLowerCase()] || {};
      const sellingPrice = Number(existing.price || existing.sellingPrice || 0);
      const comparePrice = existing.compareAtPrice !== undefined && existing.compareAtPrice !== null && existing.compareAtPrice !== ''
        ? Number(existing.compareAtPrice)
        : (existing.oldPrice !== undefined && existing.oldPrice !== null && existing.oldPrice !== '' ? Number(existing.oldPrice) : null);

      const cleanSlug = productSlug.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-');
      const sku = existing.SKU ? existing.SKU.toUpperCase() : `ELN-${cleanSlug.slice(0, 10)}-${size.toUpperCase()}`;

      return {
        size,
        price: Math.max(0, sellingPrice),
        compareAtPrice: comparePrice && comparePrice > 0 ? comparePrice : null,
        oldPrice: comparePrice && comparePrice > 0 ? comparePrice : null,
        stock: existing.stock !== undefined ? Number(existing.stock) : 999,
        SKU: sku,
        packagingCosts: existing.packagingCosts || { bottle: 0, sticker: 0, box: 0, bag: 0, other: 0 },
        costPrice: Number(existing.costPrice || 0),
        targetWeightGrams: size === '30ml' ? 28 : (size === '50ml' ? 45 : 90),
      };
    });

    return normalized;
  }

  /**
   * Create new product with variants
   */
  static async createProduct(productData) {
    let baseSlug = generateSlug(productData.name || 'elan-perfume');
    if (!baseSlug) baseSlug = `elan-${Date.now()}`;

    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (await Product.findOne({ slug })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    productData.slug = slug;

    // Normalize Gender
    if (productData.gender) {
      productData.gender = productData.gender.toString().trim().toUpperCase() === 'WOMEN' ? 'WOMEN' : 'MEN';
    } else {
      productData.gender = 'MEN';
    }

    // Normalize Notes (support comma strings or arrays)
    if (productData.notes) {
      const normNotes = {};
      ['top', 'heart', 'base'].forEach((key) => {
        if (typeof productData.notes[key] === 'string') {
          normNotes[key] = productData.notes[key].split(',').map((s) => s.trim()).filter(Boolean);
        } else if (Array.isArray(productData.notes[key])) {
          normNotes[key] = productData.notes[key].map((s) => s.toString().trim()).filter(Boolean);
        } else {
          normNotes[key] = [];
        }
      });
      productData.notes = normNotes;
    }

    // Normalize Variants
    productData.variants = this.normalizeVariants(productData.variants, slug);

    // Normalize Explicit Images
    if (productData.mainImage && typeof productData.mainImage === 'string') {
      productData.mainImage = { url: productData.mainImage, publicId: '', alt: `${productData.name} Main` };
    }
    if (productData.hoverImage && typeof productData.hoverImage === 'string') {
      productData.hoverImage = { url: productData.hoverImage, publicId: '', alt: `${productData.name} Hover` };
    }
    if (productData.pyramidImage && typeof productData.pyramidImage === 'string') {
      productData.pyramidImage = { url: productData.pyramidImage, publicId: '', alt: `${productData.name} Pyramid` };
    }
    if (productData.packagingImage && typeof productData.packagingImage === 'string') {
      productData.packagingImage = { url: productData.packagingImage, publicId: '', alt: `${productData.name} Packaging` };
    }

    const product = await Product.create(productData);
    return product;
  }

  /**
   * Get all products with filters, search, sorting & pagination
   */
  static async getAllProducts(query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const filter = {};

    // Active status filter
    if (query.active !== undefined) {
      filter.active = query.active === 'true' || query.active === true;
    }

    // Gender filter (MEN / WOMEN) - case insensitive and inclusive
    if (query.gender) {
      const g = query.gender.toString().trim().toUpperCase();
      if (g === 'MEN') {
        filter.gender = { $in: ['MEN', 'Men', 'men'] };
      } else if (g === 'WOMEN') {
        filter.gender = { $in: ['WOMEN', 'Women', 'women'] };
      }
    }

    if (query.featured === 'true' || query.featured === true) {
      filter.featured = true;
    }

    if (query.fragranceFamily) {
      filter.fragranceFamily = { $regex: query.fragranceFamily, $options: 'i' };
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { shortDescription: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { fragranceFamily: { $regex: query.search, $options: 'i' } },
        { 'variants.SKU': { $regex: query.search, $options: 'i' } }
      ];
    }

    let sort = { createdAt: -1 };
    if (query.sort === 'price-asc') {
      sort = { 'variants.price': 1 };
    } else if (query.sort === 'price-desc') {
      sort = { 'variants.price': -1 };
    } else if (query.sort === 'name-asc') {
      sort = { name: 1 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter)
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get product by slug
   */
  static async getProductBySlug(slug) {
    const product = await Product.findOne({ slug: slug.toLowerCase() });
    if (!product) {
      throw new AppError(`Product not found with slug: ${slug}`, 404, ErrorCodes.PRODUCT_NOT_FOUND, 'ProductService.getProductBySlug');
    }
    return product;
  }

  /**
   * Get product by ID
   */
  static async getProductById(id) {
    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found.', 404, ErrorCodes.PRODUCT_NOT_FOUND, 'ProductService.getProductById');
    }
    return product;
  }

  /**
   * Update product
   */
  static async updateProduct(id, updateData) {
    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found.', 404, ErrorCodes.PRODUCT_NOT_FOUND, 'ProductService.updateProduct');
    }

    // If name changed and slug not explicitly forced, update slug internally
    if (updateData.name && updateData.name.trim() !== product.name) {
      let baseSlug = generateSlug(updateData.name);
      let slug = baseSlug;
      let counter = 1;
      let existing = await Product.findOne({ slug });
      while (existing && existing._id.toString() !== id.toString()) {
        counter += 1;
        slug = `${baseSlug}-${counter}`;
        existing = await Product.findOne({ slug });
      }
      updateData.slug = slug;
    }

    // Normalize Gender
    if (updateData.gender) {
      updateData.gender = updateData.gender.toString().trim().toUpperCase() === 'WOMEN' ? 'WOMEN' : 'MEN';
    }

    // Normalize Notes
    if (updateData.notes) {
      const normNotes = {};
      ['top', 'heart', 'base'].forEach((key) => {
        if (typeof updateData.notes[key] === 'string') {
          normNotes[key] = updateData.notes[key].split(',').map((s) => s.trim()).filter(Boolean);
        } else if (Array.isArray(updateData.notes[key])) {
          normNotes[key] = updateData.notes[key].map((s) => s.toString().trim()).filter(Boolean);
        } else if (product.notes && product.notes[key]) {
          normNotes[key] = product.notes[key];
        } else {
          normNotes[key] = [];
        }
      });
      updateData.notes = normNotes;
    }

    // Normalize Variants
    if (updateData.variants) {
      updateData.variants = this.normalizeVariants(updateData.variants, updateData.slug || product.slug);
    }

    // Explicit Images
    if (updateData.mainImage !== undefined) {
      if (typeof updateData.mainImage === 'string') {
        updateData.mainImage = { url: updateData.mainImage, publicId: '', alt: `${product.name} Main` };
      }
      product.mainImage = updateData.mainImage;
    }
    if (updateData.hoverImage !== undefined) {
      if (typeof updateData.hoverImage === 'string') {
        updateData.hoverImage = { url: updateData.hoverImage, publicId: '', alt: `${product.name} Hover` };
      }
      product.hoverImage = updateData.hoverImage;
    }
    if (updateData.pyramidImage !== undefined) {
      if (typeof updateData.pyramidImage === 'string') {
        updateData.pyramidImage = { url: updateData.pyramidImage, publicId: '', alt: `${product.name} Pyramid` };
      }
      product.pyramidImage = updateData.pyramidImage;
    }
    if (updateData.packagingImage !== undefined) {
      if (typeof updateData.packagingImage === 'string') {
        updateData.packagingImage = { url: updateData.packagingImage, publicId: '', alt: `${product.name} Packaging` };
      }
      product.packagingImage = updateData.packagingImage;
    }

    Object.assign(product, updateData);
    await product.save();
    return product;
  }

  /**
   * Delete product
   */
  static async deleteProduct(id) {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      throw new AppError('Product not found.', 404, ErrorCodes.PRODUCT_NOT_FOUND, 'ProductService.deleteProduct');
    }
    return product;
  }

  /**
   * Low stock inventory alert query (stock <= threshold)
   */
  static async getLowStockProducts(threshold = 5) {
    return Product.find({
      'variants.stock': { $lte: threshold }
    }).select('name slug fragranceFamily variants active');
  }
}

module.exports = ProductService;
