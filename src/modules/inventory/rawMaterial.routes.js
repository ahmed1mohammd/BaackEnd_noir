const express = require('express');
const router = express.Router();
const rawMaterialController = require('./rawMaterial.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// All inventory operations require admin/staff authorization
router.use(protect);
router.use(restrictTo('admin', 'staff'));

// Alerts and Movements
router.get('/alerts/low-stock', rawMaterialController.getAlerts);
router.get('/low-stock', rawMaterialController.getAlerts);
router.get('/movements', rawMaterialController.getMovements);

// Direct inventory / raw-materials endpoints
router.get(['/', '/raw-materials'], rawMaterialController.getAll);
router.post(['/', '/raw-materials'], rawMaterialController.create);

router.get(['/:id', '/raw-materials/:id'], rawMaterialController.getById);
router.get(['/:id/history', '/raw-materials/:id/history'], rawMaterialController.getHistory);
router.put(['/:id', '/raw-materials/:id'], rawMaterialController.update);
router.patch(['/:id', '/raw-materials/:id'], rawMaterialController.update);
router.delete(['/:id', '/raw-materials/:id'], rawMaterialController.deleteItem);
router.post(['/:id/adjust', '/raw-materials/:id/adjust'], rawMaterialController.adjustStock);

module.exports = router;

