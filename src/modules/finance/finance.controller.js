const financeService = require('./finance.service');
const { sendResponse } = require('../../utils/responses/responseHandler');

const getOverview = async (req, res, next) => {
  try {
    const overview = await financeService.getFinanceOverview(req.query);
    return sendResponse(res, 200, 'Finance overview generated successfully', overview);
  } catch (err) {
    next(err);
  }
};

const getPL = async (req, res, next) => {
  try {
    const pl = await financeService.getFinanceOverview(req.query);
    return sendResponse(res, 200, 'P&L overview generated successfully', pl);
  } catch (err) {
    next(err);
  }
};

const getInventoryValuation = async (req, res, next) => {
  try {
    const overview = await financeService.getFinanceOverview(req.query);
    return sendResponse(res, 200, 'Inventory valuation retrieved successfully', overview.inventoryValuation);
  } catch (err) {
    next(err);
  }
};

const getReports = async (req, res, next) => {
  try {
    const reports = await financeService.getReports(req.params.type, req.query);
    return sendResponse(res, 200, 'Report data retrieved successfully', reports);
  } catch (err) {
    next(err);
  }
};

const getAccounts = async (req, res, next) => {
  try {
    const accounts = await financeService.getCashAccounts();
    return sendResponse(res, 200, 'Cash accounts retrieved successfully', accounts);

  } catch (err) {
    next(err);
  }
};

const getAccountById = async (req, res, next) => {
  try {
    const account = await financeService.getCashAccountById(req.params.id);
    return sendResponse(res, 200, 'Cash account retrieved successfully', account);
  } catch (err) {
    next(err);
  }
};

const createAccount = async (req, res, next) => {
  try {
    const account = await financeService.createCashAccount(req.body);
    return sendResponse(res, 201, 'Cash account created successfully', account);
  } catch (err) {
    next(err);
  }
};

const updateAccount = async (req, res, next) => {
  try {
    const account = await financeService.updateCashAccount(req.params.id, req.body);
    return sendResponse(res, 200, 'Cash account updated successfully', account);
  } catch (err) {
    next(err);
  }
};

const adjustBalance = async (req, res, next) => {
  try {
    const account = await financeService.adjustAccountBalance(req.params.id, req.body, req.user?._id);
    return sendResponse(res, 200, 'Account balance adjusted successfully', account);
  } catch (err) {
    next(err);
  }
};

const getMovements = async (req, res, next) => {
  try {
    const movements = await financeService.getStockMovements(req.query);
    return sendResponse(res, 200, 'Stock movements retrieved successfully', movements);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  getPL,
  getInventoryValuation,
  getReports,
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  adjustBalance,
  getMovements
};

