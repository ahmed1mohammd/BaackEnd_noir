const express = require('express');
const CouponController = require('./coupon.controller');
const { protect, restrictTo } = require('../../middleware/auth');

const router = express.Router();

router.post('/validate', CouponController.validateCoupon);

// Admin routes
router.post('/', protect, restrictTo('admin'), CouponController.createCoupon);
router.get('/', protect, restrictTo('admin'), CouponController.getAllCoupons);
router.delete('/:id', protect, restrictTo('admin'), CouponController.deleteCoupon);

module.exports = router;
