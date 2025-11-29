const axios = require('axios');
const moment = require('moment');

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

        console.log('🔧 M-Pesa Service Initialized:', {
            environment: this.environment,
            businessShortCode: this.businessShortCode,
            hasCredentials: !!(this.consumerKey && this.consumerSecret)
        });
    }

    async generateAccessToken() {
        try {
            if (!this.consumerKey || !this.consumerSecret) {
                throw new Error('M-Pesa credentials missing. Check .env file');
            }

            const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
            
            const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: {
                    Authorization: `Basic ${auth}`
                },
                timeout: 10000
            });

            if (!response.data.access_token) {
                throw new Error('No access token received from M-Pesa');
            }

            return response.data.access_token;
        } catch (error) {
            console.error('❌ M-Pesa Token Generation Failed:', {
                error: error.response?.data || error.message,
                url: error.config?.url
            });
            throw new Error(`M-Pesa token failed: ${error.response?.data?.errorMessage || error.message}`);
        }
    }

    generatePassword() {
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64');
        return { password, timestamp };
    }

    async initiateSTKPush(phone, amount, accountReference, description) {
        try {
            console.log('🔧 Initiating M-Pesa STK Push:', {
                phone,
                amount,
                accountReference,
                environment: this.environment
            });

            // Validate phone number for sandbox
            if (this.environment === 'sandbox') {
                const testNumbers = ['254708374149', '254700000000', '254711111111'];
                if (!testNumbers.includes(phone)) {
                    console.log('⚠️ Using non-test number in sandbox. Prompt may not arrive.');
                }
                
                // Force amount to 1 for sandbox testing
                if (amount > 100) {
                    console.log('⚠️ Reducing amount to 1 for sandbox testing');
                    amount = 1;
                }
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

            console.log('🔧 Sending STK Push request...');

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
                responseDescription: response.data.ResponseDescription,
                checkoutRequestId: response.data.CheckoutRequestID
            });

            if (response.data.ResponseCode !== '0') {
                throw new Error(response.data.ResponseDescription || 'STK Push failed');
            }

            return response.data;

        } catch (error) {
            console.error('❌ M-Pesa STK Push Failed:', {
                error: error.response?.data || error.message,
                phone: phone,
                amount: amount
            });
            
            throw new Error(`M-Pesa payment failed: ${error.response?.data?.errorMessage || error.message}`);
        }
    }
}

module.exports = new MpesaService();