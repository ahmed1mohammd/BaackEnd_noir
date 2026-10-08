const ReviewService = require('./review.service');
const { sendSuccess } = require('../../utils/responses/responseHandler');
const { SuccessCodes } = require('../../utils/errors/errorCodes');

class ReviewController {
  static async createReview(req, res, next) {
    try {
      const review = await ReviewService.createReview(req.user._id, req.body);
      return sendSuccess(res, 201, 'Review submitted successfully.', SuccessCodes.CREATED, 'ReviewController.createReview', review);
    } catch (error) {
      next(error);
    }
  }

  static async getProductReviews(req, res, next) {
    try {
      const reviews = await ReviewService.getProductReviews(req.params.productId);
      return sendSuccess(res, 200, 'Product reviews fetched.', SuccessCodes.FETCHED, 'ReviewController.getProductReviews', reviews);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReviewController;
