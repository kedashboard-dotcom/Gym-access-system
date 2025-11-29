const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// M-Pesa callback endpoint
router.post('/mpesa-callback', paymentController.handleCallback);

// Payment verification
router.post('/verify', paymentController.verifyPayment);

module.exports = router;