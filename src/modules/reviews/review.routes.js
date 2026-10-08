const express = require('express');
const ReviewController = require('./review.controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();

router.get('/product/:productId', ReviewController.getProductReviews);
router.post('/', protect, ReviewController.createReview);

module.exports = router;
