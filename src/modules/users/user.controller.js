const UserService = require('./user.service');
const { sendSuccess } = require('../../utils/responses/responseHandler');
const { SuccessCodes } = require('../../utils/errors/errorCodes');

class UserController {
  /**
   * Get current authenticated user profile
   */
  static async getMe(req, res, next) {
    try {
      const user = await UserService.getUserById(req.user._id);

      return sendSuccess(
        res,
        200,
        'Profile retrieved successfully.',
        SuccessCodes.FETCHED,
        'UserController.getMe',
        user
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user profile
   */
  static async updateMe(req, res, next) {
    try {
      const { name, phone } = req.body;
      const user = await UserService.updateProfile(req.user._id, { name, phone });

      return sendSuccess(
        res,
        200,
        'Profile updated successfully.',
        SuccessCodes.UPDATED,
        'UserController.updateMe',
        user
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin / Super Admin: Create User or Admin Account
   */
  static async createUser(req, res, next) {
    try {
      const user = await UserService.createUserByAdmin(req.body);

      return sendSuccess(
        res,
        201,
        'Account created successfully.',
        SuccessCodes.CREATED,
        'UserController.createUser',
        user
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin / Super Admin: Update User Account
   */
  static async updateUser(req, res, next) {
    try {
      const user = await UserService.updateUserByAdmin(req.params.id, req.body);

      return sendSuccess(
        res,
        200,
        'Account updated successfully.',
        SuccessCodes.UPDATED,
        'UserController.updateUser',
        user
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin / Super Admin: Delete User Account
   */
  static async deleteUser(req, res, next) {
    try {
      const result = await UserService.deleteUserByAdmin(req.params.id);

      return sendSuccess(
        res,
        200,
        'Account deleted successfully.',
        SuccessCodes.DELETED,
        'UserController.deleteUser',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get all users
   */
  static async getAllUsers(req, res, next) {
    try {
      const result = await UserService.getAllUsers(req.query);

      return sendSuccess(
        res,
        200,
        'Users list fetched successfully.',
        SuccessCodes.FETCHED,
        'UserController.getAllUsers',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Founding 100 members list
   */
  static async getFounding100(req, res, next) {
    try {
      const members = await UserService.getFounding100();

      return sendSuccess(
        res,
        200,
        'Founding 100 customers fetched successfully.',
        SuccessCodes.FETCHED,
        'UserController.getFounding100',
        members
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
