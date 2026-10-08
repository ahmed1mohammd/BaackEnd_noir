const AuthService = require('./auth.service');
const { sendSuccess } = require('../../utils/responses/responseHandler');
const { SuccessCodes } = require('../../utils/errors/errorCodes');

class AuthController {
  /**
   * Register or Quick Login customer
   */
  static async registerOrLogin(req, res, next) {
    try {
      const { name, phone, email, password } = req.body;
      const result = await AuthService.registerOrLogin({ name, phone, email, password });

      return sendSuccess(
        res,
        200,
        result.requiresVerification 
          ? 'Verification code sent to your email.' 
          : 'Authentication successful.',
        SuccessCodes.AUTHENTICATED,
        'AuthController.registerOrLogin',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email OTP code
   */
  static async verifyOTP(req, res, next) {
    try {
      const { email, phone, otp } = req.body;
      const result = await AuthService.verifyOTP({ email, phone, otp });

      return sendSuccess(
        res,
        200,
        'Email verified successfully. Welcome to ÉLAN.',
        SuccessCodes.AUTHENTICATED,
        'AuthController.verifyOTP',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend OTP verification code
   */
  static async resendOTP(req, res, next) {
    try {
      const { email, phone } = req.body;
      const result = await AuthService.resendOTP({ email, phone });

      return sendSuccess(
        res,
        200,
        'Verification code has been resent to your email.',
        SuccessCodes.SENT,
        'AuthController.resendOTP',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login by phone or email and password
   */
  static async login(req, res, next) {
    try {
      const { phone, email, identifier, password } = req.body;
      const result = await AuthService.login({ phone, email, identifier, password });

      return sendSuccess(
        res,
        200,
        'Login successful.',
        SuccessCodes.AUTHENTICATED,
        'AuthController.login',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user
   */
  static async getMe(req, res, next) {
    try {
      const user = await AuthService.getMe(req.user._id);
      return sendSuccess(
        res,
        200,
        'User profile retrieved successfully.',
        SuccessCodes.FETCHED,
        'AuthController.getMe',
        user
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
