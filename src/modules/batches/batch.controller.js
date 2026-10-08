const batchService = require('./batch.service');
const { sendResponse } = require('../../utils/responses/responseHandler');

const getAll = async (req, res, next) => {
  try {
    const batches = await batchService.getAllBatches(req.query);
    return sendResponse(res, 200, 'Batches retrieved successfully', batches);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const batch = await batchService.getBatchById(req.params.id);
    return sendResponse(res, 200, 'Batch retrieved successfully', batch);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const batch = await batchService.createAndConfirmBatch(req.body, req.user?._id);
    return sendResponse(res, 201, 'Production batch created and confirmed successfully', batch);
  } catch (err) {
    next(err);
  }
};

const bottle = async (req, res, next) => {
  try {
    const batch = await batchService.convertBatchToFinishedProducts(req.params.id, req.body, req.user?._id);
    return sendResponse(res, 200, 'Batch successfully bottled into finished product inventory', batch);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  bottle
};
