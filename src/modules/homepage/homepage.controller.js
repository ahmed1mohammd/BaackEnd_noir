const HomepageService = require('./homepage.service');
const { sendSuccess } = require('../../utils/responses/responseHandler');
const { SuccessCodes } = require('../../utils/errors/errorCodes');

class HomepageController {
  static async getHomepage(req, res, next) {
    try {
      const data = await HomepageService.getHomepageData();
      return sendSuccess(res, 200, 'Homepage content retrieved.', SuccessCodes.FETCHED, 'HomepageController.getHomepage', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = HomepageController;
