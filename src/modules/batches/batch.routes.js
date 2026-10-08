const express = require('express');
const router = express.Router();
const batchController = require('./batch.controller');
const { protect, restrictTo } = require('../../middleware/auth');

router.use(protect);
router.use(restrictTo('admin', 'staff'));

router.get('/', batchController.getAll);
router.get('/:id', batchController.getById);
router.post('/', batchController.create);
router.post(['/:id/bottle', '/:id/bottling'], batchController.bottle);


module.exports = router;
