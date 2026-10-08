const express = require('express');
const router = express.Router();
const expenseController = require('./expense.controller');
const { protect, restrictTo } = require('../../middleware/auth');

router.use(protect);
router.use(restrictTo('admin', 'staff'));

router.get('/', expenseController.getAll);
router.get('/summary', expenseController.getSummary);
router.get('/:id', expenseController.getById);
router.post('/', expenseController.create);
router.delete('/:id', expenseController.deleteExp);

module.exports = router;

