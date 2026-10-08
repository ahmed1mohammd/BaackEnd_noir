const bcrypt = require('bcryptjs');
const User = require('./user.model');
const AppError = require('../../utils/errors/appError');
const { ErrorCodes } = require('../../utils/errors/errorCodes');
const { normalizePhone } = require('../../utils/helpers/phoneNormalizer');
const { generateUserId } = require('../../utils/helpers/orderNumber');

class UserService {
  /**
   * Get user profile by MongoDB ID
   */
  static async getUserById(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('Customer profile not found.', 404, ErrorCodes.USER_NOT_FOUND, 'UserService.getUserById');
    }
    return user;
  }

  /**
   * Update profile (name and/or phone)
   */
  static async updateProfile(userId, { name, phone }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Customer profile not found.', 404, ErrorCodes.USER_NOT_FOUND, 'UserService.updateProfile');
    }

    if (name) {
      user.name = name.trim();
    }

    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone !== user.phone) {
        const existing = await User.findOne({ phone: normalizedPhone });
        if (existing && existing._id.toString() !== userId.toString()) {
          throw new AppError('Phone number is already associated with another account.', 400, ErrorCodes.PHONE_ALREADY_EXISTS, 'UserService.updateProfile');
        }
        user.phone = normalizedPhone;
      }
    }

    await user.save();
    return user;
  }

  /**
   * Admin / Super Admin: Create User Account (Customer, Admin, Superadmin)
   */
  static async createUserByAdmin({ name, phone, email, password, role = 'customer', isEmailVerified = true }) {
    if (!name || !name.trim()) {
      throw new AppError('Name is required.', 400, ErrorCodes.VALIDATION_ERROR, 'UserService.createUserByAdmin');
    }
    if (!phone || !phone.trim()) {
      throw new AppError('Phone number is required.', 400, ErrorCodes.VALIDATION_ERROR, 'UserService.createUserByAdmin');
    }

    const normalizedPhone = normalizePhone(phone);
    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      throw new AppError('Phone number is already registered.', 400, ErrorCodes.PHONE_ALREADY_EXISTS, 'UserService.createUserByAdmin');
    }

    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;
    if (cleanEmail) {
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        throw new AppError('Email address is already registered.', 400, ErrorCodes.EMAIL_ALREADY_EXISTS, 'UserService.createUserByAdmin');
      }
    }

    let hashedPassword = null;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    }

    const userId = generateUserId();
    const newUser = await User.create({
      userId,
      name: name.trim(),
      phone: normalizedPhone,
      email: cleanEmail,
      password: hashedPassword,
      role: ['admin', 'superadmin', 'customer'].includes(role) ? role : 'customer',
      isEmailVerified: Boolean(isEmailVerified)
    });

    const userObj = newUser.toObject();
    delete userObj.password;
    return userObj;
  }

  /**
   * Admin / Super Admin: Update User Account
   */
  static async updateUserByAdmin(id, { name, phone, email, password, role, isEmailVerified }) {
    const user = await User.findById(id).select('+password');
    if (!user) {
      throw new AppError('Account not found.', 404, ErrorCodes.USER_NOT_FOUND, 'UserService.updateUserByAdmin');
    }

    if (name) user.name = name.trim();
    if (role && ['admin', 'superadmin', 'customer'].includes(role)) user.role = role;
    if (isEmailVerified !== undefined) user.isEmailVerified = Boolean(isEmailVerified);

    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone !== user.phone) {
        const existing = await User.findOne({ phone: normalizedPhone });
        if (existing && existing._id.toString() !== id.toString()) {
          throw new AppError('Phone number is already in use.', 400, ErrorCodes.PHONE_ALREADY_EXISTS, 'UserService.updateUserByAdmin');
        }
        user.phone = normalizedPhone;
      }
    }

    if (email !== undefined) {
      const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;
      if (cleanEmail && cleanEmail !== user.email) {
        const existing = await User.findOne({ email: cleanEmail });
        if (existing && existing._id.toString() !== id.toString()) {
          throw new AppError('Email is already in use.', 400, ErrorCodes.EMAIL_ALREADY_EXISTS, 'UserService.updateUserByAdmin');
        }
      }
      user.email = cleanEmail;
    }

    if (password && password.trim()) {
      user.password = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  /**
   * Admin / Super Admin: Delete User Account
   */
  static async deleteUserByAdmin(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw new AppError('Account not found.', 404, ErrorCodes.USER_NOT_FOUND, 'UserService.deleteUserByAdmin');
    }
    return { success: true, message: 'Account deleted successfully.' };
  }

  /**
   * Admin: List users with pagination and search
   */
  static async getAllUsers(query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { userId: { $regex: query.search, $options: 'i' } }
      ];
    }

    if (query.role) {
      filter.role = query.role;
    }

    if (query.isFirst100 === 'true') {
      filter.isFirst100 = true;
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get list of Founding 100 customers sorted by founding rank
   */
  static async getFounding100() {
    return User.find({ isFirst100: true })
      .sort({ foundingRank: 1 })
      .select('name phone userId totalOrders totalSpent isFirst100 foundingRank firstOrderNumber createdAt');
  }
}

module.exports = UserService;
