const axios = require('axios');
const moment = require('moment');
const smsService = require('../utils/smsService');

class MpesaService {
    constructor() {
        this.consumerKey = process.env.MPESA_CONSUMER_KEY;
        this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        this.businessShortCode = process.env.MPESA_BUSINESS_SHORTCODE;
        this.passkey = process.env.MPESA_PASSKEY;
        this.callbackURL = process.env.MPESA_CALLBACK_URL;
        this.environment = process.env.MPESA_ENVIRONMENT || 'production';
        
        this.baseURL = this.environment === 'production' 
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';

        console.log('🔧 M-Pesa Service Initialized (Production):', {
            environment: this.environment,
            businessShortCode: this.businessShortCode,
            hasCredentials: !!(this.consumerKey && this.consumerSecret)
        });
    }

    async generateAccessToken() {
        try {
            if (!this.consumerKey || !this.consumerSecret) {
                throw new Error('M-Pesa credentials missing');
            }

            const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
            
            const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: {
                    Authorization: `Basic ${auth}`
                },
                timeout: 10000
            });

            return response.data.access_token;
        } catch (error) {
            console.error('❌ M-Pesa Token Generation Failed:', error.message);
            throw new Error(`M-Pesa token failed: ${error.message}`);
        }
    }

    generatePassword() {
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64');
        return { password, timestamp };
    }

    async initiateSTKPush(phone, amount, accountReference, description) {
        try {
            console.log('🔧 Initiating M-Pesa STK Push (Production):', {
                phone,
                amount,
                accountReference
            });

            // Validate amount for production
            if (amount < 1) {
                throw new Error('Amount must be at least KSh 1');
            }

            const accessToken = await this.generateAccessToken();
            const { password, timestamp } = this.generatePassword();

            const requestData = {
                BusinessShortCode: this.businessShortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: amount,
                PartyA: phone,
                PartyB: this.businessShortCode,
                PhoneNumber: phone,
                CallBackURL: this.callbackURL,
                AccountReference: accountReference,
                TransactionDesc: description
            };

            console.log('🔧 Sending STK Push request to M-Pesa...');

            const response = await axios.post(
                `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
                requestData,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            console.log('✅ M-Pesa STK Push Response:', {
                responseCode: response.data.ResponseCode,
                checkoutRequestId: response.data.CheckoutRequestID
            });

            if (response.data.ResponseCode !== '0') {
                throw new Error(response.data.ResponseDescription || 'STK Push failed');
            }

            // Log payment initiation for SMS polling
            try {
                const db = require('./database');
                await db.query(
                    'INSERT INTO payment_logs (checkout_request_id, phone, amount, status, created_at) VALUES (?, ?, ?, ?, ?)',
                    [response.data.CheckoutRequestID, phone, amount, 'pending', new Date()]
                );
                console.log('✅ Payment logged for SMS polling');
            } catch (dbError) {
                console.log('⚠️ Failed to log payment for SMS polling:', dbError.message);
            }

            return response.data;

        } catch (error) {
            console.error('❌ M-Pesa STK Push Failed:', {
                error: error.message,
                phone: phone,
                amount: amount
            });
            
            throw new Error(`M-Pesa payment failed: ${error.message}`);
        }
    }

    async checkPaymentStatus(checkoutRequestID) {
        try {
            console.log('🔍 Checking M-Pesa payment status for:', checkoutRequestID);

            const accessToken = await this.generateAccessToken();
            const { password, timestamp } = this.generatePassword();

            const requestData = {
                BusinessShortCode: this.businessShortCode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestID
            };

            const response = await axios.post(
                `${this.baseURL}/mpesa/stkpushquery/v1/query`,
                requestData,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            console.log('📊 M-Pesa Status Response:', response.data);

            return response.data;

        } catch (error) {
            console.error('❌ M-Pesa Status Check Failed:', error.message);
            throw new Error(`Status check failed: ${error.message}`);
        }
    }

    handleCallback(data) {
        try {
            console.log('🔔 Processing M-Pesa callback...');
            
            if (!data.Body || !data.Body.stkCallback) {
                throw new Error('Invalid callback format');
            }

            const callback = data.Body.stkCallback;
            
            if (callback.ResultCode !== 0) {
                return {
                    success: false,
                    error: callback.ResultDesc || 'Payment failed'
                };
            }

            // Extract metadata
            let metadata = {};
            if (callback.CallbackMetadata && callback.CallbackMetadata.Item) {
                callback.CallbackMetadata.Item.forEach(item => {
                    metadata[item.Name] = item.Value;
                });
            }

            return {
                success: true,
                metadata: {
                    amount: metadata.Amount,
                    mpesaReceiptNumber: metadata.MpesaReceiptNumber,
                    transactionDate: metadata.TransactionDate,
                    phoneNumber: metadata.PhoneNumber
                }
            };

        } catch (error) {
            console.error('❌ Callback processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new MpesaService();