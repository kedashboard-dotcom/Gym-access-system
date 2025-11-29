const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// M-Pesa STK Push Callback URL
router.post('/mpesa-callback', paymentController.handleCallback);

// C2B Validation URL (Optional)
router.post('/validation', paymentController.handleValidation);

// C2B Confirmation URL (Optional)
router.post('/confirmation', paymentController.handleConfirmation);

// Payment verification endpoint
router.post('/verify', async (req, res) => {
    try {
        const { checkout_request_id } = req.body;
        
        res.json({
            status: 'success',
            message: 'Payment verification endpoint',
            data: {
                checkout_request_id,
                status: 'processing'
            }
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Payment verification failed'
        });
    }
});

module.exports = router;