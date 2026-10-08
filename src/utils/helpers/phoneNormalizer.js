/**
 * Normalizes phone numbers to standard format E.164 (e.g., +201012345678)
 * @param {String} phone 
 * @returns {String} normalized phone number
 */
const normalizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';

  // Remove non-digit characters except leading plus
  let cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');

  // Handle Egyptian local format (01xxxxxxxxx -> +201xxxxxxxxx)
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = `+20${cleaned.slice(1)}`;
  } else if (cleaned.startsWith('201') && cleaned.length === 12) {
    cleaned = `+${cleaned}`;
  } else if (!cleaned.startsWith('+') && cleaned.length >= 10) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
};

module.exports = { normalizePhone };
