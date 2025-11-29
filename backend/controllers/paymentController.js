const User = require('../models/User');
const mpesaService = require('../config/mpesa');
const axtraxService = require('../utils/axtraxIntegration');

class PaymentController {
  // Handle M-Pesa callback
  async handleCallback(req, res) {
    try {
      console.log('M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));

      const callbackResult = mpesaService.handleCallback(req.body);

      if (callbackResult.success) {
        const { metadata, merchantRequestID, checkoutRequestID } = callbackResult;
        
        // Find user by account reference (membership_id)
        const user = await User.findByMembershipID(metadata.PhoneNumber);
        
        if (user) {
          // Update user payment details and activate membership
          const paymentData = {
            mpesa_receipt: metadata.MpesaReceiptNumber,
            amount: metadata.Amount,
            payment_date: new Date(metadata.TransactionDate)
          };

          const isRenewal = user.status === 'active' && new Date(user.membership_end) > new Date();
          
          let updateResult;
          if (isRenewal) {
            updateResult = await User.extendMembership(user.membership_id, paymentData);
          } else {
            updateResult = await User.updateAfterPayment(user.membership_id, paymentData);
          }

          if (updateResult) {
            // Sync with AxtraxNG access control system
            try {
              await axtraxService.syncUserWithAxtrax(user);
              console.log(`✅ User ${user.membership_id} synced with AxtraxNG`);
            } catch (axtraxError) {
              console.error('Axtrax sync error:', axtraxError);
              // Continue even if Axtrax sync fails - payment is still successful
            }

            console.log(`✅ Payment successful for ${user.membership_id}`);
          }
        }

        // Send success response to M-Pesa
        res.json({
          ResultCode: 0,
          ResultDesc: "Success"
        });
      } else {
        console.log('❌ Payment failed:', callbackResult.error);
        
        // Send failure response to M-Pesa
        res.json({
          ResultCode: 1,
          ResultDesc: "Failed"
        });
      }

    } catch (error) {
      console.error('Callback handling error:', error);
      res.json({
        ResultCode: 1,
        ResultDesc: "Failed"
      });
    }
  }

  // Manual payment verification
  async verifyPayment(req, res) {
    try {
      const { checkout_request_id } = req.body;

      // In a real implementation, you would query M-Pesa API to verify payment status
      // For now, we'll return a mock response

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
  }
}

module.exports = new PaymentController();