const bcrypt = require('bcryptjs');

/**
 * Hash password or PIN string
 * @param {String} password 
 * @returns {Promise<String>} hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

/**
 * Compare plain password with hash
 * @param {String} candidate 
 * @param {String} hash 
 * @returns {Promise<Boolean>} match
 */
const comparePassword = async (candidate, hash) => {
  return bcrypt.compare(candidate, hash);
};

module.exports = {
  hashPassword,
  comparePassword
};
