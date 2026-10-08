const crypto = require('crypto');

/**
 * Generate unique server-controlled order number
 * Format: ELAN-YYYYMMDD-XXXX
 * @returns {String} orderNumber
 */
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ELAN-${dateStr}-${randomHex}`;
};

/**
 * Generate unique internal user ID
 * Format: ELAN-CUST-XXXXXXXX
 * @returns {String} userId
 */
const generateUserId = () => {
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ELAN-CUST-${randomHex}`;
};

module.exports = {
  generateOrderNumber,
  generateUserId
};
