const axios = require('axios');

class SMSService {
    constructor() {
        this.apiKey = process.env.SMS_API_KEY;
        this.apiSecret = process.env.SMS_API_SECRET;
        this.senderId = process.env.SMS_SENDER_ID || 'MsingiGym';
        this.provider = process.env.SMS_PROVIDER || 'africastalking';
        
        console.log('📱 SMS Service Initialized:', {
            provider: this.provider,
            senderId: this.senderId,
            hasApiKey: !!this.apiKey
        });
    }

    async sendSMS(phoneNumber, message) {
        try {
            // Format phone number
            let formattedPhone = phoneNumber.replace(/\D/g, '');
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '254' + formattedPhone.substring(1);
            } else if (formattedPhone.startsWith('7') && formattedPhone.length === 9) {
                formattedPhone = '254' + formattedPhone;
            }

            console.log('📱 Sending SMS:', {
                to: formattedPhone,
                messageLength: message.length
            });

            // If no SMS API configured, log and return mock response
            if (!this.apiKey) {
                console.log('📱 SMS Mock - No API key configured. Message would be:');
                console.log('   To:', formattedPhone);
                console.log('   Message:', message);
                
                return {
                    status: 'mock',
                    messageId: 'mock-' + Date.now(),
                    recipient: formattedPhone,
                    message: 'SMS would be sent if API key was configured'
                };
            }

            // Africa's Talking SMS API
            if (this.provider === 'africastalking') {
                const response = await axios.post(
                    'https://api.africastalking.com/version1/messaging',
                    {
                        username: 'sandbox', // Use 'sandbox' for testing
                        to: formattedPhone,
                        message: message,
                        from: this.senderId
                    },
                    {
                        headers: {
                            'ApiKey': this.apiKey,
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Accept': 'application/json'
                        }
                    }
                );

                return {
                    status: 'success',
                    messageId: response.data.SMSMessageData.Recipients[0]?.messageId || Date.now(),
                    recipient: formattedPhone
                };
            }
            
            // Add other SMS providers here as needed
            throw new Error(`SMS provider ${this.provider} not implemented`);

        } catch (error) {
            console.error('❌ SMS Sending Failed:', {
                error: error.response?.data || error.message,
                phone: phoneNumber
            });
            
            // Return mock response even on error to not block main flow
            return {
                status: 'error',
                messageId: 'error-' + Date.now(),
                recipient: phoneNumber,
                error: error.message
            };
        }
    }

    // Send payment confirmation SMS
    async sendPaymentConfirmation(phone, name, amount, receipt, membershipId, expiryDate) {
        const message = `Dear ${name}, your gym membership payment of KSh ${amount} is confirmed. ` +
                       `Receipt: ${receipt}. Membership ID: ${membershipId}. ` +
                       `Expires: ${new Date(expiryDate).toLocaleDateString()}. ` +
                       `Welcome to Msingi Gym!`;
        
        return this.sendSMS(phone, message);
    }

    // Send renewal confirmation SMS
    async sendRenewalConfirmation(phone, name, amount, receipt, membershipId, newExpiry) {
        const message = `Dear ${name}, your gym membership renewal of KSh ${amount} is confirmed. ` +
                       `Receipt: ${receipt}. Membership ID: ${membershipId}. ` +
                       `New expiry: ${new Date(newExpiry).toLocaleDateString()}. ` +
                       `Access extended successfully!`;
        
        return this.sendSMS(phone, message);
    }

    // Send payment reminder SMS
    async sendPaymentReminder(phone, name, membershipId, daysLeft) {
        const message = `Dear ${name}, your gym membership (${membershipId}) ` +
                       `expires in ${daysLeft} day(s). Renew now to continue uninterrupted access. ` +
                       `Visit msingi.co.ke to renew.`;
        
        return this.sendSMS(phone, message);
    }
}

module.exports = new SMSService();