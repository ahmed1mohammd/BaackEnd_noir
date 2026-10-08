const ProductService = require('./product.service');
const { sendSuccess } = require('../../utils/responses/responseHandler');
const { SuccessCodes } = require('../../utils/errors/errorCodes');

class ProductController {
  /**
   * Admin: Create product
   */
  static async createProduct(req, res, next) {
    try {
      const product = await ProductService.createProduct(req.body);

      return sendSuccess(
        res,
        201,
        'Product created successfully.',
        SuccessCodes.CREATED,
        'ProductController.createProduct',
        product
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all products with filters
   */
  static async getAllProducts(req, res, next) {
    try {
      const result = await ProductService.getAllProducts(req.query);

      return sendSuccess(
        res,
        200,
        'Products retrieved successfully.',
        SuccessCodes.FETCHED,
        'ProductController.getAllProducts',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by slug
   */
  static async getProductBySlug(req, res, next) {
    try {
      const product = await ProductService.getProductBySlug(req.params.slug);

      return sendSuccess(
        res,
        200,
        'Product details retrieved successfully.',
        SuccessCodes.FETCHED,
        'ProductController.getProductBySlug',
        product
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(req, res, next) {
    try {
      const product = await ProductService.getProductById(req.params.id);

      return sendSuccess(
        res,
        200,
        'Product details retrieved successfully.',
        SuccessCodes.FETCHED,
        'ProductController.getProductById',
        product
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Update product
   */
  static async updateProduct(req, res, next) {
    try {
      const product = await ProductService.updateProduct(req.params.id, req.body);

      return sendSuccess(
        res,
        200,
        'Product updated successfully.',
        SuccessCodes.UPDATED,
        'ProductController.updateProduct',
        product
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Delete product
   */
  static async deleteProduct(req, res, next) {
    try {
      await ProductService.deleteProduct(req.params.id);

      return sendSuccess(
        res,
        200,
        'Product deleted successfully.',
        SuccessCodes.DELETED,
        'ProductController.deleteProduct',
        null
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get low stock inventory alert
   */
  static async getLowStockProducts(req, res, next) {
    try {
      const threshold = parseInt(req.query.threshold, 10) || 5;
      const products = await ProductService.getLowStockProducts(threshold);

      return sendSuccess(
        res,
        200,
        'Low stock inventory report generated.',
        SuccessCodes.FETCHED,
        'ProductController.getLowStockProducts',
        products
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;
