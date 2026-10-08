const Order = require('../../modules/orders/order.model');
const User = require('../../modules/users/user.model');
const Product = require('../../modules/products/product.model');
const logger = require('../../utils/helpers/logger');

/**
 * Idempotent Fawaterk Webhook Processor
 * Updates order status, reduces inventory stock, updates customer stats,
 * and triggers First 100 Founding Customer logic.
 *
 * @param {Object} webhookPayload - Webhook payload from Fawaterk
 * @returns {Object} result summary
 */
const processFawaterkWebhook = async (webhookPayload) => {
  const { invoice_id, custom_ref, invoice_status, payment_method } = webhookPayload;
  const orderNumber = custom_ref || webhookPayload.order_number;

  logger.payment(`Processing payment webhook for order: ${orderNumber} (Invoice: ${invoice_id}, Status: ${invoice_status})`);

  // 1. Find the target order
  const order = await Order.findOne({
    $or: [{ orderNumber: orderNumber }, { paymentReference: String(invoice_id) }]
  });

  if (!order) {
    logger.error(`Webhook error: Order not found for reference ${orderNumber} / ${invoice_id}`);
    return { success: false, message: 'Order reference not found' };
  }

  // 2. IDEMPOTENCY GUARD: Prevent duplicate processing if webhook is called multiple times
  if (order.paymentStatus === 'paid') {
    logger.payment(`Idempotency check: Order ${order.orderNumber} is already marked as PAID. Skipping duplicate processing.`);
    return { success: true, message: 'Webhook already processed (Idempotent)' };
  }

  const isSuccessful =
    String(invoice_status).toLowerCase() === 'paid' ||
    String(invoice_status).toLowerCase() === 'success' ||
    webhookPayload.status === 'success';

  if (isSuccessful) {
    // A. Mark Order as PAID and CONFIRMED
    order.paymentStatus = 'paid';
    order.orderStatus = 'confirmed';
    if (invoice_id) order.paymentReference = String(invoice_id);
    await order.save();

    logger.payment(`Order ${order.orderNumber} successfully marked as PAID & CONFIRMED.`);

    // B. Safely reduce inventory stock for each order item
    for (const item of order.items) {
      try {
        await Product.updateOne(
          { _id: item.product, 'variants.SKU': item.variantSKU },
          { $inc: { 'variants.$.stock': -item.quantity } }
        );
        logger.info(`Stock reduced for item ${item.productName} (${item.variantSKU}) by -${item.quantity}`);
      } catch (err) {
        logger.error(`Failed to reduce stock for item ${item.variantSKU}: ${err.message}`);
      }
    }

    // C. Update Customer order stats (totalOrders & totalSpent)
    const customer = await User.findById(order.customer);
    if (customer) {
      customer.totalOrders += 1;
      customer.totalSpent += order.total;

      // D. FIRST 100 FOUNDING CUSTOMERS LOGIC
      // Count total paid orders across system
      const paidOrdersCount = await Order.countDocuments({ paymentStatus: 'paid' });

      if (paidOrdersCount <= 100) {
        if (!customer.isFirst100) {
          customer.isFirst100 = true;
          customer.foundingRank = paidOrdersCount;
          customer.firstOrderNumber = order.orderNumber;
          logger.info(`🎉 CUSTOMER ${customer.name} (${customer.phone}) ASSIGNED FOUNDING 100 RANK #${paidOrdersCount}!`);
        }
        order.processedFirst100 = true;
        await order.save();
      }

      await customer.save();
    }

    return {
      success: true,
      message: 'Payment confirmed, stock updated, and First 100 logic evaluated successfully.',
      orderNumber: order.orderNumber
    };
  } else {
    // Payment failed or cancelled
    order.paymentStatus = 'failed';
    await order.save();
    logger.payment(`Order ${order.orderNumber} payment marked as FAILED.`);
    return { success: true, message: 'Order marked as failed.' };
  }
};

module.exports = {
  processFawaterkWebhook
};
