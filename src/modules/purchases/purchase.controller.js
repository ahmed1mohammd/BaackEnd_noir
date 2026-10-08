const purchaseService = require('./purchase.service');
const { sendResponse } = require('../../utils/responses/responseHandler');

const getAll = async (req, res, next) => {
  try {
    const purchases = await purchaseService.getAllPurchases(req.query);
    return sendResponse(res, 200, 'Purchases retrieved successfully', purchases);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const purchase = await purchaseService.getPurchaseById(req.params.id);
    return sendResponse(res, 200, 'Purchase retrieved successfully', purchase);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const purchase = await purchaseService.createPurchase(req.body, req.user?._id);
    return sendResponse(res, 201, 'Raw materials purchase recorded successfully', purchase);
  } catch (err) {
    next(err);
  }
};

const deletePurchase = async (req, res, next) => {
  try {
    const result = await purchaseService.deletePurchase(req.params.id);
    return sendResponse(res, 200, 'Purchase deleted successfully', result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  deletePurchase
};

