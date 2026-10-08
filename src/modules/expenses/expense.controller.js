const expenseService = require('./expense.service');
const { sendResponse } = require('../../utils/responses/responseHandler');

const getAll = async (req, res, next) => {
  try {
    const expenses = await expenseService.getAllExpenses(req.query);
    return sendResponse(res, 200, 'Expenses retrieved successfully', expenses);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);
    return sendResponse(res, 200, 'Expense retrieved successfully', expense);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(req.body, req.user?._id);
    return sendResponse(res, 201, 'Expense recorded successfully', expense);
  } catch (err) {
    next(err);
  }
};

const deleteExp = async (req, res, next) => {
  try {
    const result = await expenseService.deleteExpense(req.params.id);
    return sendResponse(res, 200, 'Expense deleted successfully', result);
  } catch (err) {
    next(err);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const summary = await expenseService.getExpensesSummary(req.query);
    return sendResponse(res, 200, 'Expenses summary retrieved successfully', summary);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  deleteExp,
  getSummary
};

