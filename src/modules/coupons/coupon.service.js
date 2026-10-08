const Coupon = require('./coupon.model');
const AppError = require('../../utils/errors/appError');
const { ErrorCodes } = require('../../utils/errors/errorCodes');

class CouponService {
  static async createCoupon(data) {
    const code = data.code.toUpperCase().trim();
    const existing = await Coupon.findOne({ code });
    if (existing) {
      throw new AppError(`Coupon '${code}' already exists.`, 400, ErrorCodes.DUPLICATE_RESOURCE, 'CouponService.createCoupon');
    }
    data.code = code;
    return Coupon.create(data);
  }

  static async validateCoupon(code, cartTotal) {
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), active: true });
    if (!coupon) {
      throw new AppError('Invalid or inactive coupon code.', 404, ErrorCodes.COUPON_NOT_FOUND, 'CouponService.validateCoupon');
    }

    if (new Date() > coupon.expiryDate) {
      throw new AppError('This coupon code has expired.', 400, ErrorCodes.COUPON_EXPIRED, 'CouponService.validateCoupon');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError('This coupon usage limit has been reached.', 400, ErrorCodes.INVALID_COUPON, 'CouponService.validateCoupon');
    }

    if (cartTotal < coupon.minPurchaseAmount) {
      throw new AppError(`Minimum order amount of ${coupon.minPurchaseAmount} EGP required to use this coupon.`, 400, ErrorCodes.INVALID_COUPON, 'CouponService.validateCoupon');
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (cartTotal * coupon.discountAmount) / 100;
      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else {
      discount = Math.min(coupon.discountAmount, cartTotal);
    }

    return {
      coupon,
      discountAmount: discount
    };
  }

  static async getAllCoupons() {
    return Coupon.find().sort({ createdAt: -1 });
  }

  static async deleteCoupon(id) {
    return Coupon.findByIdAndDelete(id);
  }
}

module.exports = CouponService;
