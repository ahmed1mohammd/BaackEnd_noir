const express = require('express');
const router = express.Router();
const SettingsController = require('./settings.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// Public settings endpoint for Storefront checkout
router.get('/public', SettingsController.getPublicSettings);

// Admin-only management endpoints
router.get('/', protect, restrictTo('admin', 'staff'), SettingsController.getAdminSettings);
router.put('/', protect, restrictTo('admin'), SettingsController.updateSettings);

module.exports = router;
