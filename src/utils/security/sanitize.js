/**
 * Input sanitization helpers
 */

/**
 * Strips HTML tags and trims whitespace from input string
 * @param {String} str 
 * @returns {String} sanitized string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Recursively sanitizes object properties
 * @param {Object} obj 
 * @returns {Object} sanitized object
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

module.exports = {
  sanitizeString,
  sanitizeObject
};
