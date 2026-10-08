const CloudinaryService = require('./cloudinary.service');
const { sendSuccess } = require('../utils/responses/responseHandler');
const { SuccessCodes } = require('../utils/errors/errorCodes');
const AppError = require('../utils/errors/appError');

class CloudinaryController {
  /**
   * Upload single image handler
   */
  static async uploadSingleImage(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No image file provided in request.', 400, 'VALIDATION_ERROR', 'CloudinaryController.uploadSingleImage');
      }

      const folder = req.body.folder || 'elan/products';
      const result = await CloudinaryService.uploadImageStream(req.file.buffer, folder);

      return sendSuccess(
        res,
        201,
        'Image uploaded successfully to Cloudinary.',
        SuccessCodes.CREATED,
        'CloudinaryController.uploadSingleImage',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload multiple images handler
   */
  static async uploadMultipleImages(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        throw new AppError('No image files provided in request.', 400, 'VALIDATION_ERROR', 'CloudinaryController.uploadMultipleImages');
      }

      const folder = req.body.folder || 'elan/products';
      const uploadPromises = req.files.map((file) => CloudinaryService.uploadImageStream(file.buffer, folder));
      const results = await Promise.all(uploadPromises);

      return sendSuccess(
        res,
        201,
        'Multiple images uploaded successfully to Cloudinary.',
        SuccessCodes.CREATED,
        'CloudinaryController.uploadMultipleImages',
        results
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete image handler
   */
  static async deleteImage(req, res, next) {
    try {
      const { publicId } = req.body;
      if (!publicId) {
        throw new AppError('publicId is required to delete image.', 400, 'VALIDATION_ERROR', 'CloudinaryController.deleteImage');
      }

      const result = await CloudinaryService.deleteImage(publicId);

      return sendSuccess(
        res,
        200,
        'Image deleted successfully from Cloudinary.',
        SuccessCodes.DELETED,
        'CloudinaryController.deleteImage',
        result
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CloudinaryController;
