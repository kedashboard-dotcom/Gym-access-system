const axios = require('axios');
const moment = require('moment');
const { Logger } = require('../middleware/errorHandler');
require('dotenv').config();

class MpesaService {
    constructor() {
        this.consumerKey = process.env.MPESA_CONSUMER_KEY;
        this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        this.businessShortCode = process.env.MPESA_BUSINESS_SHORTCODE;
        this.passkey = process.env.MPESA_PASSKEY;
        this.callbackURL = process.env.MPESA_CALLBACK_URL;
        this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
        
        this.baseURL = this.environment === 'production' 
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';

        Logger.info('M-Pesa service initialized', {
            environment: this.environment,
            businessShortCode: this.businessShortCode
        });
    }

    // Generate access token
    async generateAccessToken() {
        try {
            Logger.debug('Generating M-Pesa access token');
            const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
            
            const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            });

            Logger.debug('M-Pesa access token generated successfully');
            return response.data.access_token;
        } catch (error) {
            Logger.error('Failed to generate M-Pesa access token', {
                error: error.response?.data || error.message,
                url: `${this.baseURL}/oauth/v1/generate`
            });
            throw new Error('Failed to generate M-Pesa access token');
        }
    }

    // Generate password for STK Push
    generatePassword() {
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64');
        Logger.debug('Generated M-Pesa password', { timestamp });
        return { password, timestamp };
    }

    // Initiate STK Push
    async initiateSTKPush(phone, amount, accountReference, description) {
        try {
            Logger.info('Initiating M-Pesa STK Push', {
                phone,
                amount,
                accountReference,
                description
            });

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

            Logger.debug('Sending STK Push request', { requestData });

            const response = await axios.post(
                `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
                requestData,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            Logger.info('M-Pesa STK Push initiated successfully', {
                responseCode: response.data.ResponseCode,
                checkoutRequestId: response.data.CheckoutRequestID,
                merchantRequestId: response.data.MerchantRequestID
            });

            return response.data;
        } catch (error) {
            Logger.error('Failed to initiate M-Pesa STK Push', {
                error: error.response?.data || error.message,
                phone,
                amount,
                accountReference
            });
            throw new Error('Failed to initiate M-Pesa payment');
        }
    }

    // Handle M-Pesa callback
    handleCallback(callbackData) {
        try {
            Logger.info('M-Pesa callback received', { callbackData });

            const result = callbackData.Body.stkCallback;
            const resultCode = result.ResultCode;
            const merchantRequestID = result.MerchantRequestID;
            const checkoutRequestID = result.CheckoutRequestID;

            if (resultCode === 0) {
                // Payment successful
                const callbackMetadata = result.CallbackMetadata.Item;
                const metadata = {};

                callbackMetadata.forEach(item => {
                    metadata[item.Name] = item.Value;
                });

                const resultData = {
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

                Logger.info('M-Pesa payment successful', resultData);
                return resultData;
            } else {
                // Payment failed
                const resultData = {
                    success: false,
                    merchantRequestID,
                    checkoutRequestID,
                    error: result.ResultDesc
                };

                Logger.warn('M-Pesa payment failed', resultData);
                return resultData;
            }
        } catch (error) {
            Logger.error('Error processing M-Pesa callback', {
                error: error.message,
                callbackData: callbackData
            });
            throw new Error('Failed to process M-Pesa callback');
        }
    }
}

module.exports = new MpesaService();