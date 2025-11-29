const { Logger } = require('../middleware/errorHandler');

class PaymentController {
    // Handle M-Pesa STK Push Callback
    async handleCallback(req, res) {
        try {
            console.log('📱 M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));
            
            const callbackData = req.body;
            
            // Check if this is a valid callback
            if (!callbackData.Body || !callbackData.Body.stkCallback) {
                Logger.error('Invalid M-Pesa callback structure', { callbackData });
                return res.json({
                    ResultCode: 1,
                    ResultDesc: "Invalid callback structure"
                });
            }

            const stkCallback = callbackData.Body.stkCallback;
            const resultCode = stkCallback.ResultCode;
            const merchantRequestID = stkCallback.MerchantRequestID;
            const checkoutRequestID = stkCallback.CheckoutRequestID;

            Logger.info('M-Pesa Callback Processing', {
                resultCode,
                merchantRequestID,
                checkoutRequestID
            });

            if (resultCode === 0) {
                // Payment was successful
                const callbackMetadata = stkCallback.CallbackMetadata;
                if (!callbackMetadata || !callbackMetadata.Item) {
                    Logger.error('Missing metadata in successful callback', { stkCallback });
                    return res.json({
                        ResultCode: 1,
                        ResultDesc: "Missing metadata"
                    });
                }

                const metadata = {};
                callbackMetadata.Item.forEach(item => {
                    metadata[item.Name] = item.Value;
                });

                const paymentData = {
                    success: true,
                    merchantRequestID,
                    checkoutRequestID,
                    metadata: {
                        amount: metadata.Amount,
                        mpesaReceiptNumber: metadata.MpesaReceiptNumber,
                        transactionDate: metadata.TransactionDate,
                        phoneNumber: metadata.PhoneNumber
                    }
                };

                Logger.info('M-Pesa Payment Successful', paymentData);

                console.log('💰 PAYMENT SUCCESSFUL:', {
                    receipt: metadata.MpesaReceiptNumber,
                    amount: metadata.Amount,
                    phone: metadata.PhoneNumber,
                    date: metadata.TransactionDate
                });

                // Send success response to M-Pesa
                res.json({
                    ResultCode: 0,
                    ResultDesc: "Success"
                });

            } else {
                // Payment failed
                const errorMessage = stkCallback.ResultDesc || 'Payment failed';
                
                Logger.warn('M-Pesa Payment Failed', {
                    resultCode,
                    errorMessage,
                    merchantRequestID,
                    checkoutRequestID
                });

                console.log('❌ PAYMENT FAILED:', errorMessage);

                // Send failure response to M-Pesa
                res.json({
                    ResultCode: 0, // Still return 0 to acknowledge receipt
                    ResultDesc: "Failed payment acknowledged"
                });
            }

        } catch (error) {
            Logger.error('M-Pesa Callback Processing Error', {
                error: error.message,
                stack: error.stack
            });

            console.error('❌ CALLBACK PROCESSING ERROR:', error);

            // Always return success to M-Pesa to prevent retries
            res.json({
                ResultCode: 0,
                ResultDesc: "Callback received with errors"
            });
        }
    }

    // C2B Validation URL (Optional)
    async handleValidation(req, res) {
        try {
            console.log('🔍 C2B Validation Request:', JSON.stringify(req.body, null, 2));
            
            // For sandbox, always validate the transaction
            const response = {
                ResultCode: 0,
                ResultDesc: "Success",
                ThirdPartyTransID: "1234567890"
            };

            res.json(response);

        } catch (error) {
            console.error('Validation error:', error);
            res.json({
                ResultCode: 1,
                ResultDesc: "Validation failed"
            });
        }
    }

    // C2B Confirmation URL (Optional)
    async handleConfirmation(req, res) {
        try {
            console.log('✅ C2B Confirmation Request:', JSON.stringify(req.body, null, 2));
            
            // Process the confirmed transaction
            const transactionData = req.body;
            
            // TODO: Update your database with confirmed transaction
            
            res.json({
                ResultCode: 0,
                ResultDesc: "Success"
            });

        } catch (error) {
            console.error('Confirmation error:', error);
            res.json({
                ResultCode: 1,
                ResultDesc: "Confirmation failed"
            });
        }
    }
}

module.exports = new PaymentController();