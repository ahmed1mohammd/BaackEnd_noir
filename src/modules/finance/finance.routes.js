const express = require('express');
const router = express.Router();
const financeController = require('./finance.controller');
const { protect, restrictTo } = require('../../middleware/auth');

router.use(protect);
router.use(restrictTo('admin', 'staff'));

router.get(['/overview', '/pl'], financeController.getPL);
router.get('/inventory-valuation', financeController.getInventoryValuation);
router.get('/reports/:type', financeController.getReports);

// Cash Accounts
router.get(['/accounts', '/cash-accounts'], financeController.getAccounts);
router.get(['/accounts/:id', '/cash-accounts/:id'], financeController.getAccountById);
router.post(['/accounts', '/cash-accounts'], financeController.createAccount);
router.put(['/accounts/:id', '/cash-accounts/:id'], financeController.updateAccount);
router.patch(['/accounts/:id', '/cash-accounts/:id'], financeController.updateAccount);
router.post(['/accounts/:id/adjust', '/cash-accounts/:id/adjust'], financeController.adjustBalance);

router.get('/stock-movements', financeController.getMovements);

module.exports = router;

