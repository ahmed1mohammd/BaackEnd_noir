const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/elan_fragrance',
  jwt: {
    secret: process.env.JWT_SECRET || 'elan_fallback_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || ''
  },
  fawaterk: {
    apiKey: process.env.FAWATERK_API_KEY || '',
    baseUrl: process.env.FAWATERK_BASE_URL || 'https://staging.fawaterk.com/api/v2',
    webhookSecret: process.env.FAWATERK_WEBHOOK_SECRET || '',
    redirectUrl: process.env.FAWATERK_REDIRECT_URL || 'http://localhost:3000/checkout/success'
  }
};
