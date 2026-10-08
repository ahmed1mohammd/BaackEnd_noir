const crypto = require('crypto');
const config = require('./config');

/**
 * Generate HMAC SHA256 signature for webhook payload validation
 * @param {Object|String} payload 
 * @returns {String} hex signature
 */
const generateSignature = (payload) => {
  const secret = config.webhookSecret || config.apiKey;
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Verify Fawaterk Webhook signature
 * @param {Object} reqHeaderSignature 
 * @param {Object} payload 
 * @returns {Boolean}
 */
const verifyWebhookSignature = (reqHeaderSignature, payload) => {
  if (!config.webhookSecret) {
    // If no secret configured in test/dev, bypass or compare with api key
    return true;
  }

  const computed = generateSignature(payload);
  return crypto.timingSafeEqual(Buffer.from(reqHeaderSignature || ''), Buffer.from(computed));
};

module.exports = {
  generateSignature,
  verifyWebhookSignature
};
