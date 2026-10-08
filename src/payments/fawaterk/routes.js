const express = require('express');
const FawaterkController = require('./controller');
const { verifyFawaterkWebhook } = require('./middleware');
const validate = require('../../middleware/validation');
const { initiatePaymentSchema } = require('./validators');
const { protect } = require('../../middleware/auth');

const router = express.Router();

// Initiate payment checkout link
router.post('/initiate', protect, validate(initiatePaymentSchema, 'Fawaterk.Initiate'), FawaterkController.initiatePayment);

// Fawaterk Payment Callback Webhook
router.post('/webhook', verifyFawaterkWebhook, FawaterkController.handleWebhook);

// Check invoice status
router.get('/status/:invoiceId', protect, FawaterkController.checkStatus);

module.exports = router;
