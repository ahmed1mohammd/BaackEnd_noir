const bcrypt = require('bcryptjs');
const User = require('../users/user.model');
const { normalizePhone } = require('../../utils/helpers/phoneNormalizer');
const { generateUserId } = require('../../utils/helpers/orderNumber');
const { signToken } = require('../../utils/security/jwt');
const EmailService = require('../../utils/email/emailService');
const AppError = require('../../utils/errors/appError');
const { ErrorCodes } = require('../../utils/errors/errorCodes');

class AuthService {
  /**
   * Generate secure 6-digit numeric OTP
   */
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Register customer with name, phone, email, and password.
   * Sends 6-digit verification code via Nodemailer.
   */
  static async registerOrLogin({ name, phone, email, password }) {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      throw new AppError('Invalid phone number format.', 400, ErrorCodes.INVALID_PHONE_NUMBER, 'AuthService.registerOrLogin');
    }

    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;

    let user = await User.findOne({
      $or: [
        { phone: normalizedPhone },
        ...(cleanEmail ? [{ email: cleanEmail }] : [])
      ]
    }).select('+password +emailVerificationCode +emailVerificationExpires');

    let hashedPassword = null;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    }

    const otp = cleanEmail ? this.generateOTP() : null;
    const otpExpires = cleanEmail ? new Date(Date.now() + 10 * 60 * 1000) : null;

    if (!user) {
      if (!name) {
        throw new AppError('Customer name is required for registration.', 400, ErrorCodes.VALIDATION_ERROR, 'AuthService.registerOrLogin');
      }

      const userId = generateUserId();
      user = await User.create({
        userId,
        name: name.trim(),
        phone: normalizedPhone,
        email: cleanEmail,
        password: hashedPassword,
        isEmailVerified: false,
        emailVerificationCode: otp,
        emailVerificationExpires: otpExpires,
        role: 'customer'
      });
    } else {
      if (name && name.trim()) user.name = name.trim();
      if (cleanEmail) user.email = cleanEmail;
      if (hashedPassword) user.password = hashedPassword;
      if (otp) {
        user.emailVerificationCode = otp;
        user.emailVerificationExpires = otpExpires;
      }
      await user.save();
    }

    // Send email verification via Nodemailer if email exists
    if (cleanEmail && otp) {
      await EmailService.sendVerificationOTP({
        to: cleanEmail,
        name: user.name,
        otp
      });
    }

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.emailVerificationCode;
    delete userObj.emailVerificationExpires;

    const token = signToken({
      id: user._id,
      userId: user.userId,
      phone: user.phone,
      role: user.role
    });

    return { 
      user: userObj, 
      token, 
      requiresVerification: Boolean(cleanEmail && !user.isEmailVerified),
      email: cleanEmail 
    };
  }

  /**
   * Verify email OTP code
   */
  static async verifyOTP({ email, phone, otp }) {
    if (!otp || !otp.trim()) {
      throw new AppError('Verification code is required.', 400, ErrorCodes.VALIDATION_ERROR, 'AuthService.verifyOTP');
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    if (!cleanEmail && !normalizedPhone) {
      throw new AppError('Email or phone number is required.', 400, ErrorCodes.VALIDATION_ERROR, 'AuthService.verifyOTP');
    }

    const user = await User.findOne({
      $or: [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])
      ]
    }).select('+emailVerificationCode +emailVerificationExpires');

    if (!user) {
      throw new AppError('Account not found.', 404, ErrorCodes.USER_NOT_FOUND, 'AuthService.verifyOTP');
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires < Date.now()) {
      throw new AppError('Verification code has expired. Please request a new one.', 400, ErrorCodes.VALIDATION_ERROR, 'AuthService.verifyOTP');
    }

    if (user.emailVerificationCode !== otp.trim()) {
      throw new AppError('Invalid verification code. Please check and try again.', 400, ErrorCodes.AUTH_INVALID_CREDENTIALS, 'AuthService.verifyOTP');
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.emailVerificationCode;
    delete userObj.emailVerificationExpires;

    const token = signToken({
      id: user._id,
      userId: user.userId,
      phone: user.phone,
      role: user.role
    });

    return { user: userObj, token };
  }

  /**
   * Resend verification OTP
   */
  static async resendOTP({ email, phone }) {
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    const user = await User.findOne({
      $or: [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])
      ]
    });

    if (!user) {
      throw new AppError('Account not found.', 404, ErrorCodes.USER_NOT_FOUND, 'AuthService.resendOTP');
    }

    if (!user.email) {
      throw new AppError('No email associated with this account.', 400, ErrorCodes.VALIDATION_ERROR, 'AuthService.resendOTP');
    }

    const otp = this.generateOTP();
    user.emailVerificationCode = otp;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await EmailService.sendVerificationOTP({
      to: user.email,
      name: user.name,
      otp
    });

    return { success: true, message: 'Verification code resent successfully.' };
  }

  /**
   * Login by phone or email with optional password
   */
  static async login({ phone, email, identifier, password }) {
    const queryTerm = identifier || phone || email;
    if (!queryTerm) {
      throw new AppError('Phone number or email is required.', 400, ErrorCodes.VALIDATION_ERROR, 'AuthService.login');
    }

    const normalizedPhone = normalizePhone(queryTerm);
    const cleanEmail = queryTerm.trim().toLowerCase();

    const user = await User.findOne({
      $or: [
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        { email: cleanEmail }
      ]
    }).select('+password');

    if (!user) {
      throw new AppError('No account found with these credentials. Please register.', 404, ErrorCodes.USER_NOT_FOUND, 'AuthService.login');
    }

    if (user.password && password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new AppError('Invalid password. Please check your credentials.', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS, 'AuthService.login');
      }
    }

    const userObj = user.toObject();
    delete userObj.password;

    const token = signToken({
      id: user._id,
      userId: user.userId,
      phone: user.phone,
      role: user.role
    });

    return { 
      user: userObj, 
      token,
      requiresVerification: Boolean(user.email && !user.isEmailVerified)
    };
  }

  /**
   * Get user profile by ID
   */
  static async getMe(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found.', 404, ErrorCodes.USER_NOT_FOUND, 'AuthService.getMe');
    }
    return user;
  }
}

module.exports = AuthService;
