/**
 * Structured Server Logger
 */
const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? meta : '');
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? meta : '');
  },
  error: (message, meta = {}) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? meta : '');
  },
  payment: (message, meta = {}) => {
    console.log(`[PAYMENT] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? meta : '');
  },
  auth: (message, meta = {}) => {
    console.log(`[AUTH] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? meta : '');
  }
};

module.exports = logger;
