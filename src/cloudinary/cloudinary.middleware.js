const multer = require('multer');
const AppError = require('../utils/errors/appError');
const { ErrorCodes } = require('../utils/errors/errorCodes');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimetypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type. Only JPEG, JPG, PNG, and WEBP images are allowed.',
        400,
        ErrorCodes.INVALID_FILE_TYPE,
        'CloudinaryMiddleware.fileFilter'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max per file
  }
});

const handleMulterSingle = (fieldName) => {
  const uploadSingle = upload.single(fieldName);
  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('File size exceeds 5MB limit.', 400, ErrorCodes.FILE_TOO_LARGE, 'CloudinaryMiddleware.MulterLimit'));
        }
        return next(new AppError(`File upload error: ${err.message}`, 400, ErrorCodes.IMAGE_UPLOAD_FAILED, 'CloudinaryMiddleware.MulterError'));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

const handleMulterArray = (fieldName, maxCount = 5) => {
  const uploadArray = upload.array(fieldName, maxCount);
  return (req, res, next) => {
    uploadArray(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('One or more files exceed 5MB limit.', 400, ErrorCodes.FILE_TOO_LARGE, 'CloudinaryMiddleware.MulterLimit'));
        }
        return next(new AppError(`File upload error: ${err.message}`, 400, ErrorCodes.IMAGE_UPLOAD_FAILED, 'CloudinaryMiddleware.MulterError'));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

module.exports = {
  uploadSingle: handleMulterSingle,
  uploadArray: handleMulterArray
};
