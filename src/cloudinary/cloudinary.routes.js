const express = require('express');
const CloudinaryController = require('./cloudinary.controller');
const { uploadSingle, uploadArray } = require('./cloudinary.middleware');

const router = express.Router();

router.post('/upload', uploadSingle('image'), CloudinaryController.uploadSingleImage);
router.post('/upload-multiple', uploadArray('images', 5), CloudinaryController.uploadMultipleImages);
router.delete('/delete', CloudinaryController.deleteImage);

module.exports = router;
