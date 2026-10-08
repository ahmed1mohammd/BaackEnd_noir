const express = require('express');
const OrderController = require('./order.controller');
const validate = require('../../middleware/validation');
const { createOrderSchema, shippingQuoteSchema, updateOrderStatusSchema } = require('./order.validation');
const { protect, optionalProtect, restrictTo } = require('../../middleware/auth');

const router = express.Router();

// Public / Quote, Tracking, & QR Verification routes
router.post('/shipping-quote', validate(shippingQuoteSchema, 'Order.ShippingQuote'), OrderController.getShippingQuote);
router.get('/public-verify/:orderNumber', OrderController.publicVerify);
router.get('/track/:query', OrderController.trackOrder);
router.post('/track', OrderController.trackOrder);

// Order creation - supports both guest checkout and logged in user
router.post('/', optionalProtect, validate(createOrderSchema, 'Order.Create'), OrderController.createOrder);

// Customer protected routes
router.get('/my-orders', protect, OrderController.getMyOrders);
router.get('/:id', protect, OrderController.getOrderById);

// Admin routes
router.get('/', protect, restrictTo('admin'), OrderController.getAllOrders);
router.post('/admin/create', protect, restrictTo('admin'), OrderController.createAdminOrder);
router.post('/admin', protect, restrictTo('admin'), OrderController.createAdminOrder);
router.patch('/:id/status', protect, restrictTo('admin'), validate(updateOrderStatusSchema, 'Order.UpdateStatus'), OrderController.updateOrderStatus);
router.put('/:id/verify-payment', protect, restrictTo('admin'), OrderController.verifyPayment);

module.exports = router;
