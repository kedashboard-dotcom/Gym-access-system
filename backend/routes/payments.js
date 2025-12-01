const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// M-Pesa sends GET request to validate callback URL
router.get('/mpesa-callback', (req, res) => {
  console.log('✅ M-Pesa callback URL validation received (GET request)');
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);
  
  // Send success response to validate the endpoint
  res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Callback URL is valid and ready to receive payments"
  });
});

// M-Pesa callback endpoint (POST for actual payments)
router.post('/mpesa-callback', paymentController.handleCallback);

// Payment verification (manual)
router.post('/verify', paymentController.verifyPayment);

// Debug endpoint to test callback
router.post('/test-callback', (req, res) => {
  console.log('🧪 Test callback received:', req.body);
  
  // Simulate M-Pesa callback
  const testData = {
    Body: {
      stkCallback: {
        MerchantRequestID: "29115-34620561-1",
        CheckoutRequestID: "ws_CO_191220191020363925",
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 2 },
            { Name: "MpesaReceiptNumber", Value: "RE123456789" },
            { Name: "TransactionDate", Value: "20240115102036" },
            { Name: "PhoneNumber", Value: "254712345678" }
          ]
        }
      }
    }
  };
  
  // Process the test callback
  paymentController.handleCallback({ body: testData }, res);
});

module.exports = router;