const jwt = require('jsonwebtoken');
const env = require('../../config/env');

/**
 * Sign JWT Token
 * @param {Object} payload 
 * @returns {String} token
 */
const signToken = (payload) => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn
  });
};

/**
 * Verify JWT Token
 * @param {String} token 
 * @returns {Object} decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.jwt.secret);
};

module.exports = {
  signToken,
  verifyToken
};
