const env = require('../../config/env');

module.exports = {
  apiKey: env.fawaterk.apiKey,
  baseUrl: env.fawaterk.baseUrl,
  webhookSecret: env.fawaterk.webhookSecret,
  redirectUrl: env.fawaterk.redirectUrl,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.fawaterk.apiKey}`
  }
};
