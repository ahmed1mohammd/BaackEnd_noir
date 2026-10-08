const rawMaterialService = require('./rawMaterial.service');
const { sendResponse } = require('../../utils/responses/responseHandler');

const getAll = async (req, res, next) => {
  try {
    const materials = await rawMaterialService.getAllRawMaterials(req.query);
    return sendResponse(res, 200, 'Raw materials retrieved successfully', materials);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const material = await rawMaterialService.getRawMaterialById(req.params.id);
    return sendResponse(res, 200, 'Raw material retrieved successfully', material);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const material = await rawMaterialService.createRawMaterial(req.body, req.user?._id);
    return sendResponse(res, 201, 'Raw material created successfully', material);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const material = await rawMaterialService.updateRawMaterial(req.params.id, req.body, req.user?._id);
    return sendResponse(res, 200, 'Raw material updated successfully', material);
  } catch (err) {
    next(err);
  }
};

const adjustStock = async (req, res, next) => {
  try {
    const result = await rawMaterialService.adjustStock(req.params.id, req.body, req.user?._id);
    return sendResponse(res, 200, 'Stock adjusted successfully', result);
  } catch (err) {
    next(err);
  }
};

const getAlerts = async (req, res, next) => {
  try {
    const alerts = await rawMaterialService.getLowStockAlerts();
    return sendResponse(res, 200, 'Low stock alerts retrieved', alerts);
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const history = await rawMaterialService.getStockHistory(req.params.id);
    return sendResponse(res, 200, 'Stock movement history retrieved', history);
  } catch (err) {
    next(err);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    await rawMaterialService.deleteRawMaterial(req.params.id);
    return sendResponse(res, 200, 'Raw material deleted successfully');
  } catch (err) {
    next(err);
  }
};

const getMovements = async (req, res, next) => {
  try {
    const movements = await rawMaterialService.getStockMovements(req.query);
    return sendResponse(res, 200, 'Stock movements retrieved successfully', { movements });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteItem,
  adjustStock,
  getAlerts,
  getHistory,
  getMovements
};
