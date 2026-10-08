const CouponService = require('./coupon.service');
const { sendSuccess } = require('../../utils/responses/responseHandler');
const { SuccessCodes } = require('../../utils/errors/errorCodes');

class CouponController {
  static async createCoupon(req, res, next) {
    try {
      const coupon = await CouponService.createCoupon(req.body);
      return sendSuccess(res, 201, 'Coupon created successfully.', SuccessCodes.CREATED, 'CouponController.createCoupon', coupon);
    } catch (error) {
      next(error);
    }
  }

  static async validateCoupon(req, res, next) {
    try {
      const { code, cartTotal } = req.body;
      const result = await CouponService.validateCoupon(code, parseFloat(cartTotal));
      return sendSuccess(res, 200, 'Coupon applied successfully.', SuccessCodes.OK, 'CouponController.validateCoupon', result);
    } catch (error) {
      next(error);
    }
  }

  static async getAllCoupons(req, res, next) {
    try {
      const coupons = await CouponService.getAllCoupons();
      return sendSuccess(res, 200, 'Coupons list retrieved.', SuccessCodes.FETCHED, 'CouponController.getAllCoupons', coupons);
    } catch (error) {
      next(error);
    }
  }

  static async deleteCoupon(req, res, next) {
    try {
      await CouponService.deleteCoupon(req.params.id);
      return sendSuccess(res, 200, 'Coupon deleted.', SuccessCodes.DELETED, 'CouponController.deleteCoupon', null);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CouponController;
