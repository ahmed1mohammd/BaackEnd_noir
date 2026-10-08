const express = require('express');
const UserController = require('./user.controller');
const { protect, restrictTo } = require('../../middleware/auth');

const router = express.Router();

// Customer authenticated routes
router.get('/me', protect, UserController.getMe);
router.patch('/me', protect, UserController.updateMe);

// Public or Customer Founding 100 showcase
router.get('/founding-100', UserController.getFounding100);

// Admin / Super Admin routes
router.get('/', protect, restrictTo('admin', 'superadmin'), UserController.getAllUsers);
router.post('/', protect, restrictTo('admin', 'superadmin'), UserController.createUser);
router.patch('/:id', protect, restrictTo('admin', 'superadmin'), UserController.updateUser);
router.delete('/:id', protect, restrictTo('admin', 'superadmin'), UserController.deleteUser);

module.exports = router;
