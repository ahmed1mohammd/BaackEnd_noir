const axios = require('axios');
const config = require('./config');
const { mapOrderToFawaterkInvoice } = require('./mapper');
const Order = require('../../modules/orders/order.model');
const User = require('../../modules/users/user.model');
const AppError = require('../../utils/errors/appError');
const { ErrorCodes } = require('../../utils/errors/errorCodes');
const logger = require('../../utils/helpers/logger');

class FawaterkService {
  /**
   * Create Fawaterk Payment Invoice
   * @param {String} orderId - Mongoose ID or OrderNumber
   * @returns {Object} { invoice_id, invoice_key, url }
   */
  static async createInvoice(orderId) {
    const filter = orderId.startsWith('ELAN-') ? { orderNumber: orderId } : { _id: orderId };
    const order = await Order.findOne(filter);

    if (!order) {
      throw new AppError('Order not found for payment initialization.', 404, ErrorCodes.ORDER_NOT_FOUND, 'FawaterkService.createInvoice');
    }

    if (order.paymentStatus === 'paid') {
      throw new AppError('Order has already been paid.', 400, ErrorCodes.PAYMENT_FAILED, 'FawaterkService.createInvoice');
    }

    const customer = await User.findById(order.customer);
    if (!customer) {
      throw new AppError('Customer associated with order not found.', 404, ErrorCodes.USER_NOT_FOUND, 'FawaterkService.createInvoice');
    }

    const payload = mapOrderToFawaterkInvoice(order, customer);

    try {
      logger.payment(`Initiating Fawaterk invoice for order ${order.orderNumber}`);

      const response = await axios.post(`${config.baseUrl}/invoice/pay`, payload, {
        headers: config.headers,
        timeout: 15000
      });

      if (response.data && response.data.status === 'success') {
        const invoiceData = response.data.data;
        order.paymentReference = invoiceData.invoice_id || invoiceData.invoice_key;
        await order.save();

        return {
          invoiceId: invoiceData.invoice_id,
          invoiceKey: invoiceData.invoice_key,
          paymentUrl: invoiceData.url || invoiceData.payment_data?.redirectTo
        };
      } else {
        const errorMsg = response.data?.message || 'Failed to generate Fawaterk payment invoice.';
        throw new AppError(errorMsg, 400, ErrorCodes.FAWATERK_API_ERROR, 'FawaterkService.createInvoice');
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Fawaterk API connection error: ${error.message}`);
      throw new AppError(
        `Fawaterk API request failed: ${error.response?.data?.message || error.message}`,
        502,
        ErrorCodes.FAWATERK_API_ERROR,
        'FawaterkService.createInvoice'
      );
    }
  }

  /**
   * Check status of invoice directly with Fawaterk API
   * @param {String} invoiceId 
   * @returns {Object} invoice status
   */
  static async checkInvoiceStatus(invoiceId) {
    try {
      const response = await axios.get(`${config.baseUrl}/invoice/status/${invoiceId}`, {
        headers: config.headers
      });

      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      throw new AppError('Failed to fetch invoice status from Fawaterk.', 400, ErrorCodes.FAWATERK_API_ERROR, 'FawaterkService.checkInvoiceStatus');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Fawaterk status check failed: ${error.message}`, 502, ErrorCodes.FAWATERK_API_ERROR, 'FawaterkService.checkInvoiceStatus');
    }
  }
}

module.exports = FawaterkService;
