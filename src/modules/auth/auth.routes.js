const express = require('express');
const AuthController = require('./auth.controller');
const validate = require('../../middleware/validation');
const { registerSchema, loginSchema } = require('./auth.validation');
const { authRateLimiter } = require('../../middleware/rateLimiter');
const { protect } = require('../../middleware/auth');

const router = express.Router();

router.post('/register', authRateLimiter, validate(registerSchema, 'Auth.Register'), AuthController.registerOrLogin);
router.post('/login', authRateLimiter, validate(loginSchema, 'Auth.Login'), AuthController.login);
router.post('/verify-otp', authRateLimiter, AuthController.verifyOTP);
router.post('/resend-otp', authRateLimiter, AuthController.resendOTP);
router.get('/me', protect, AuthController.getMe);

module.exports = router;
