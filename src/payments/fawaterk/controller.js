const FawaterkService = require('./service');
const { processFawaterkWebhook } = require('./webhook');
const { sendSuccess } = require('../../utils/responses/responseHandler');
const { SuccessCodes } = require('../../utils/errors/errorCodes');

class FawaterkController {
  /**
   * Initiate Fawaterk payment for an order
   */
  static async initiatePayment(req, res, next) {
    try {
      const { orderId } = req.body;
      const paymentData = await FawaterkService.createInvoice(orderId);

      return sendSuccess(
        res,
        200,
        'Fawaterk payment invoice generated successfully.',
        SuccessCodes.PAYMENT_INITIATED,
        'FawaterkController.initiatePayment',
        paymentData
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Fawaterk Webhook Notification
   */
  static async handleWebhook(req, res, next) {
    try {
      const result = await processFawaterkWebhook(req.body);

      return sendSuccess(
        res,
        200,
        result.message || 'Webhook processed successfully.',
        SuccessCodes.PAYMENT_PROCESSED,
        'FawaterkController.handleWebhook',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check invoice status endpoint
   */
  static async checkStatus(req, res, next) {
    try {
      const { invoiceId } = req.params;
      const statusData = await FawaterkService.checkInvoiceStatus(invoiceId);

      return sendSuccess(
        res,
        200,
        'Invoice status fetched successfully.',
        SuccessCodes.FETCHED,
        'FawaterkController.checkStatus',
        statusData
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FawaterkController;
