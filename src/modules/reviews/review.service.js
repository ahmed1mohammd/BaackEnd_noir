const Review = require('./review.model');
const Order = require('../orders/order.model');
const AppError = require('../../utils/errors/appError');
const { ErrorCodes } = require('../../utils/errors/errorCodes');

class ReviewService {
  static async createReview(userId, { productId, rating, comment }) {
    // Check if user already reviewed
    const existing = await Review.findOne({ product: productId, user: userId });
    if (existing) {
      throw new AppError('You have already reviewed this product.', 400, ErrorCodes.DUPLICATE_RESOURCE, 'ReviewService.createReview');
    }

    // Check if user has bought this product
    const paidOrder = await Order.findOne({
      customer: userId,
      paymentStatus: 'paid',
      'items.product': productId
    });

    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      comment,
      verifiedPurchase: !!paidOrder
    });

    return review;
  }

  static async getProductReviews(productId) {
    return Review.find({ product: productId })
      .populate('user', 'name isFirst100 foundingRank')
      .sort({ createdAt: -1 });
  }
}

module.exports = ReviewService;
