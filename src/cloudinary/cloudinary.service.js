const cloudinary = require('./cloudinary.config');
const AppError = require('../utils/errors/appError');
const { ErrorCodes } = require('../utils/errors/errorCodes');

class CloudinaryService {
  /**
   * Upload image buffer to Cloudinary
   * @param {Buffer} buffer - File buffer
   * @param {String} folder - Folder name in Cloudinary (e.g. 'elan/products')
   * @returns {Promise<Object>} { secure_url, public_id, format, width, height }
   */
  static async uploadImageStream(buffer, folder = 'elan/products') {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }]
        },
        (error, result) => {
          if (error) {
            return reject(
              new AppError(
                `Cloudinary upload error: ${error.message}`,
                500,
                ErrorCodes.IMAGE_UPLOAD_FAILED,
                'CloudinaryService.uploadImageStream'
              )
            );
          }
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height
          });
        }
      );
      uploadStream.end(buffer);
    });
  }

  /**
   * Delete image from Cloudinary by public ID
   * @param {String} publicId - Cloudinary public ID
   * @returns {Promise<Object>}
   */
  static async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new AppError(
        `Cloudinary delete error: ${error.message}`,
        500,
        ErrorCodes.IMAGE_UPLOAD_FAILED,
        'CloudinaryService.deleteImage'
      );
    }
  }
}

module.exports = CloudinaryService;
