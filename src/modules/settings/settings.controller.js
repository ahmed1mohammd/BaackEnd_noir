const SettingsService = require('./settings.service');
const { sendResponse } = require('../../utils/responses/responseHandler');

class SettingsController {
  static async getPublicSettings(req, res, next) {
    try {
      const settings = await SettingsService.getPublicSettings();
      return sendResponse(res, 200, 'Public settings retrieved successfully', settings);
    } catch (err) {
      next(err);
    }
  }

  static async getAdminSettings(req, res, next) {
    try {
      const settings = await SettingsService.getSettings();
      return sendResponse(res, 200, 'Settings retrieved successfully', settings);
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req, res, next) {
    try {
      const settings = await SettingsService.updateSettings(req.body);
      return sendResponse(res, 200, 'Settings updated successfully', settings);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SettingsController;
