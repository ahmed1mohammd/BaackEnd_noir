const config = require('./config');

/**
 * Maps ÉLAN Order & Customer details to Fawaterk invoice request payload
 * @param {Object} order - Mongoose Order object
 * @param {Object} customer - Mongoose User object
 * @returns {Object} Fawaterk Invoice Payload
 */
const mapOrderToFawaterkInvoice = (order, customer) => {
  const cartItems = order.items.map((item) => ({
    name: `${item.productName} (${item.size})`,
    price: item.price,
    quantity: item.quantity
  }));

  if (order.shipping > 0) {
    cartItems.push({
      name: 'Shipping Fee',
      price: order.shipping,
      quantity: 1
    });
  }

  if (order.discount > 0) {
    cartItems.push({
      name: 'Discount Coupon',
      price: -Math.abs(order.discount),
      quantity: 1
    });
  }

  // Name splitting safely
  const nameParts = (customer.name || 'Valued Customer').trim().split(' ');
  const first_name = nameParts[0] || 'Customer';
  const last_name = nameParts.slice(1).join(' ') || 'ÉLAN';

  return {
    payment_method_id: 1, // Default card/hosted checkout
    cartTotal: order.total.toFixed(2),
    currency: 'EGP',
    customer: {
      first_name,
      last_name,
      email: customer.email || `${customer.phone.replace(/[^0-9]/g, '')}@elan-fragrance.com`,
      phone: customer.phone,
      address: order.shippingAddress.street || 'Cairo, Egypt'
    },
    redirectionUrls: {
      successUrl: `${config.redirectUrl}?orderNumber=${order.orderNumber}&status=success`,
      failUrl: `${config.redirectUrl}?orderNumber=${order.orderNumber}&status=failed`,
      pendingUrl: `${config.redirectUrl}?orderNumber=${order.orderNumber}&status=pending`
    },
    cartItems,
    custom_ref: order.orderNumber
  };
};

module.exports = {
  mapOrderToFawaterkInvoice
};
