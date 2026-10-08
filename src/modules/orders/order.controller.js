const OrderService = require('./order.service');
const { sendSuccess } = require('../../utils/responses/responseHandler');
const { SuccessCodes } = require('../../utils/errors/errorCodes');

class OrderController {
  /**
   * Create order (Supports both Authenticated Customer and Guest Checkout)
   */
  static async createOrder(req, res, next) {
    try {
      const customerId = req.user ? req.user._id : null;
      const order = await OrderService.createOrder(customerId, req.body);

      return sendSuccess(
        res,
        201,
        'Order created successfully.',
        SuccessCodes.CREATED,
        'OrderController.createOrder',
        order
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Track order by Order Number or Phone (Public)
   */
  static async trackOrder(req, res, next) {
    try {
      const query = req.params.query || req.body.query || req.query.query;
      const orders = await OrderService.trackOrder(query);

      return sendSuccess(
        res,
        200,
        'Order tracking details retrieved successfully.',
        SuccessCodes.FETCHED,
        'OrderController.trackOrder',
        orders
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate shipping quote (Public or Customer)
   */
  static async getShippingQuote(req, res, next) {
    try {
      const { deliveryMethod, governorate, city, subtotal } = req.body;
      const fees = OrderService.getShippingFee({
        deliveryMethod,
        governorate,
        city,
        subtotal: parseFloat(subtotal) || 0
      });

      const sub = parseFloat(subtotal) || 0;
      const feeToAdd = deliveryMethod === 'metro_pickup' ? fees.metroPickupFee : fees.shippingFee;

      return sendSuccess(
        res,
        200,
        'Shipping quote calculated successfully.',
        SuccessCodes.FETCHED,
        'OrderController.getShippingQuote',
        {
          subtotal: sub,
          shippingFee: fees.shippingFee,
          metroPickupFee: fees.metroPickupFee,
          total: sub + feeToAdd
        }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer orders
   */
  static async getMyOrders(req, res, next) {
    try {
      const result = await OrderService.getCustomerOrders(req.user._id, req.query);

      return sendSuccess(
        res,
        200,
        'Customer orders retrieved successfully.',
        SuccessCodes.FETCHED,
        'OrderController.getMyOrders',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single order details
   */
  static async getOrderById(req, res, next) {
    try {
      const customerId = req.user.role === 'admin' ? null : req.user._id;
      const order = await OrderService.getOrderById(req.params.id, customerId);

      return sendSuccess(
        res,
        200,
        'Order details retrieved successfully.',
        SuccessCodes.FETCHED,
        'OrderController.getOrderById',
        order
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get all orders
   */
  static async getAllOrders(req, res, next) {
    try {
      const result = await OrderService.getAllOrders(req.query);

      return sendSuccess(
        res,
        200,
        'Orders list retrieved successfully.',
        SuccessCodes.FETCHED,
        'OrderController.getAllOrders',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Update order status
   */
  static async updateOrderStatus(req, res, next) {
    try {
      const order = await OrderService.updateOrderStatus(req.params.id, req.body);

      return sendSuccess(
        res,
        200,
        'Order status updated successfully.',
        SuccessCodes.UPDATED,
        'OrderController.updateOrderStatus',
        order
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Verify order payment and credit cash account
   */
  static async verifyPayment(req, res, next) {
    try {
      const order = await OrderService.verifyOrderPayment(
        req.params.id,
        req.body,
        req.user
      );

      return sendSuccess(
        res,
        200,
        'Order payment successfully verified and recorded.',
        SuccessCodes.UPDATED,
        'OrderController.verifyPayment',
        order
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public: Invoice QR Code verification
   */
  static async publicVerify(req, res, next) {
    try {
      const verification = await OrderService.getPublicVerification(req.params.orderNumber);

      return sendSuccess(
        res,
        200,
        'Order verification details retrieved.',
        SuccessCodes.FETCHED,
        'OrderController.publicVerify',
        verification
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Create manual order directly from Dashboard
   */
  static async createAdminOrder(req, res, next) {
    try {
      const order = await OrderService.createAdminOrder(req.body, req.user);

      return sendSuccess(
        res,
        201,
        'Manual order created successfully.',
        SuccessCodes.CREATED,
        'OrderController.createAdminOrder',
        order
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OrderController;
