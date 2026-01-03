const axios = require('axios');
const db = require('../config/database');

class SMSService {
    constructor() {
        this.apiKey = process.env.SMS_API_KEY;
        this.apiSecret = process.env.SMS_API_SECRET;
        this.senderId = process.env.SMS_SENDER_ID || 'MsingiGym';
        this.provider = process.env.SMS_PROVIDER || 'africastalking';
        this.enabled = process.env.SMS_ENABLED === 'true';
        
        console.log('📱 SMS Service Initialized:', {
            enabled: this.enabled,
            provider: this.provider,
            senderId: this.senderId
        });
    }

    // Send SMS via Africa's Talking
    async sendSMS(phone, message) {
        if (!this.enabled) {
            console.log('📱 SMS service is disabled');
            return { success: false, message: 'SMS service disabled' };
        }

        try {
            if (this.provider === 'africastalking') {
                return await this.sendViaAfricasTalking(phone, message);
            } else {
                // Add other providers here
                console.log('⚠️ Unsupported SMS provider:', this.provider);
                return { success: false, message: 'Unsupported provider' };
            }
        } catch (error) {
            console.error('❌ SMS sending failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async sendViaAfricasTalking(phone, message) {
        try {
            const response = await axios.post(
                'https://api.africastalking.com/version1/messaging',
                {
                    username: process.env.AFRICASTALKING_USERNAME,
                    to: phone,
                    message: message,
                    from: this.senderId
                },
                {
                    headers: {
                        'apiKey': this.apiKey,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }
                }
            );

            console.log('✅ SMS sent via Africa\'s Talking:', response.data);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('❌ Africa\'s Talking API error:', error.response?.data || error.message);
            throw error;
        }
    }

    // Send payment confirmation SMS
    async sendPaymentConfirmation({ phone, membership_id, amount, receipt, name }) {
        const message = `Dear ${name},\n\n` +
                       `Your Msingi Gym payment of KSh ${amount} was successful!\n` +
                       `Membership ID: ${membership_id}\n` +
                       `M-Pesa Receipt: ${receipt}\n` +
                       `Access activated for 1 day.\n\n` +
                       `Welcome to Msingi Gym!`;

        const result = await this.sendSMS(phone, message);
        
        // Log SMS delivery
        try {
            await db.query(
                'INSERT INTO sms_logs (phone, message, type, status, sent_at) VALUES (?, ?, ?, ?, ?)',
                [phone, message, 'payment_confirmation', result.success ? 'sent' : 'failed', new Date()]
            );
        } catch (dbError) {
            console.log('⚠️ Failed to log SMS:', dbError.message);
        }

        return result;
    }

    // Send registration confirmation SMS
    async sendRegistrationConfirmation({ phone, name, membership_id, amount }) {
        const message = `Dear ${name},\n\n` +
                       `Welcome to Msingi Gym!\n` +
                       `Your membership ID: ${membership_id}\n` +
                       `Amount: KSh ${amount}\n` +
                       `Please complete payment via M-Pesa to activate access.\n\n` +
                       `Thank you!`;

        return await this.sendSMS(phone, message);
    }

    // Send renewal reminder SMS
    async sendRenewalReminder({ phone, name, membership_id, expiry_date }) {
        const message = `Dear ${name},\n\n` +
                       `Your Msingi Gym membership (${membership_id}) expires on ${expiry_date}.\n` +
                       `Renew now to continue enjoying 24/7 access.\n\n` +
                       `Reply RENEW to renew automatically.`;

        return await this.sendSMS(phone, message);
    }

    // SMS POLLING: Check pending payments and send reminders
    async pollPendingPayments() {
        if (!this.enabled) {
            return { success: 0, failed: 0, total: 0 };
        }

        try {
            console.log('🔍 SMS Polling: Checking for pending payments...');
            
            // Get pending payments from last 30 minutes
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            
            const [pendingPayments] = await db.query(
                `SELECT pl.*, u.name, u.membership_id 
                 FROM payment_logs pl
                 LEFT JOIN users u ON pl.phone = u.phone
                 WHERE pl.status = 'pending' 
                 AND pl.created_at >= ?
                 ORDER BY pl.created_at DESC`,
                [thirtyMinutesAgo]
            );

            console.log(`📊 Found ${pendingPayments.length} pending payments`);

            let successful = 0;
            let failed = 0;

            for (const payment of pendingPayments) {
                try {
                    // Check if payment was completed
                    const mpesaService = require('../config/mpesa');
                    const status = await mpesaService.checkPaymentStatus(payment.checkout_request_id);

                    if (status.ResultCode === '0') {
                        // Payment successful - send confirmation
                        await this.sendPaymentConfirmation({
                            phone: payment.phone,
                            membership_id: payment.membership_id,
                            amount: payment.amount,
                            receipt: status.MpesaReceiptNumber || 'N/A',
                            name: payment.name || 'Member'
                        });

                        // Update payment status
                        await db.query(
                            'UPDATE payment_logs SET status = ? WHERE id = ?',
                            ['completed', payment.id]
                        );

                        successful++;
                        console.log(`✅ Sent confirmation to ${payment.phone}`);
                    } else {
                        // Payment failed or pending
                        console.log(`⏳ Payment still pending for ${payment.phone}`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to process payment for ${payment.phone}:`, error.message);
                    failed++;
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            return {
                success: successful,
                failed: failed,
                total: pendingPayments.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ SMS polling failed:', error);
            return { success: 0, failed: 0, total: 0, error: error.message };
        }
    }

    // Get SMS statistics
    async getSMSStats() {
        try {
            const [today] = await db.query(
                `SELECT COUNT(*) as count FROM sms_logs WHERE DATE(sent_at) = CURDATE()`
            );
            
            const [successful] = await db.query(
                `SELECT COUNT(*) as count FROM sms_logs WHERE status = 'sent'`
            );

            const [failed] = await db.query(
                `SELECT COUNT(*) as count FROM sms_logs WHERE status = 'failed'`
            );

            return {
                today: today[0].count,
                successful: successful[0].count,
                failed: failed[0].count,
                enabled: this.enabled
            };
        } catch (error) {
            console.log('⚠️ Failed to get SMS stats:', error.message);
            return { today: 0, successful: 0, failed: 0, enabled: this.enabled };
        }
    }
}

module.exports = new SMSService();