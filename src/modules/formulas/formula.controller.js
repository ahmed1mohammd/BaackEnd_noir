const formulaService = require('./formula.service');
const { sendResponse } = require('../../utils/responses/responseHandler');

const getAll = async (req, res, next) => {
  try {
    const formulas = await formulaService.getAllFormulas(req.query);
    return sendResponse(res, 200, 'Formulas retrieved successfully', formulas);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const formula = await formulaService.getFormulaById(req.params.id);
    return sendResponse(res, 200, 'Formula retrieved successfully', formula);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const formula = await formulaService.createFormula(req.body, req.user?._id);
    return sendResponse(res, 201, 'Formula created successfully', formula);
  } catch (err) {
    next(err);
  }
};

const preview = async (req, res, next) => {
  try {
    const calculation = await formulaService.calculateBatchPreview(req.body);
    return sendResponse(res, 200, 'Batch calculation preview generated', calculation);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  preview
};
