const User = require('../models/User');
const mpesaService = require('../config/mpesa');
const axtraxService = require('../utils/axtraxIntegration');
const { validatePhone, validateName } = require('../utils/validation');

class MemberController {
    // New member registration
    async register(req, res) {
        const startTime = Date.now();
        
        try {
            const { name, phone, amount = 2000, membership_type = 'standard' } = req.body;

            console.log('Member registration attempt:', { name, phone, amount, membership_type });

            // Validation
            if (!name || !phone) {
                console.log('Registration validation failed - missing fields');
                return res.status(400).json({
                    status: 'error',
                    message: 'Name and phone number are required'
                });
            }

            if (!validateName(name)) {
                console.log('Registration validation failed - invalid name');
                return res.status(400).json({
                    status: 'error',
                    message: 'Please enter a valid name (letters and spaces only)'
                });
            }

            if (!validatePhone(phone)) {
                console.log('Registration validation failed - invalid phone');
                return res.status(400).json({
                    status: 'error',
                    message: 'Please enter a valid Kenyan phone number (e.g., 254712345678)'
                });
            }

            // Check if user already has active membership
            const existingUser = await User.findByPhone(phone);
            if (existingUser && existingUser.status === 'active' && new Date(existingUser.membership_end) > new Date()) {
                console.log('Registration failed - user already has active membership');
                return res.status(400).json({
                    status: 'error',
                    message: 'You already have an active membership. Please use membership renewal instead.',
                    membership_id: existingUser.membership_id
                });
            }

            // Create user record
            const user = await User.create({ name, phone, amount, membership_type });
            console.log('User record created successfully:', user.membership_id);
            
            // Initiate M-Pesa payment
            const paymentResponse = await mpesaService.initiateSTKPush(
                phone,
                amount,
                user.membership_id,
                `Gym Membership - ${membership_type}`
            );

            if (paymentResponse.ResponseCode === '0') {
                const duration = Date.now() - startTime;
                console.log('Member registration completed successfully:', {
                    membershipId: user.membership_id,
                    duration: `${duration}ms`
                });

                res.json({
                    status: 'success',
                    message: 'Payment request sent to your phone. Please complete the transaction.',
                    data: {
                        membership_id: user.membership_id,
                        checkout_request_id: paymentResponse.CheckoutRequestID,
                        merchant_request_id: paymentResponse.MerchantRequestID
                    }
                });
            } else {
                console.error('M-Pesa payment initiation failed:', paymentResponse);
                throw new Error(paymentResponse.ResponseDescription || 'Payment initiation failed');
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('Member registration failed:', {
                error: error.message,
                duration: `${duration}ms`
            });
            
            res.status(500).json({
                status: 'error',
                message: error.message || 'Registration failed. Please try again.'
            });
        }
    }

    // Membership renewal
    async renew(req, res) {
        const startTime = Date.now();
        
        try {
            const { membership_id, phone, amount = 2000 } = req.body;

            console.log('Membership renewal attempt:', { membership_id, phone, amount });

            if (!membership_id && !phone) {
                console.log('Renewal validation failed - no identifier provided');
                return res.status(400).json({
                    status: 'error',
                    message: 'Membership ID or phone number is required'
                });
            }

            // Find user
            let user;
            if (membership_id) {
                user = await User.findByMembershipID(membership_id);
            } else if (phone) {
                user = await User.findByPhone(phone);
            }

            if (!user) {
                console.log('Renewal failed - user not found');
                return res.status(404).json({
                    status: 'error',
                    message: 'Membership not found. Please check your Membership ID or phone number.'
                });
            }

            console.log('User found for renewal:', user.membership_id);

            // Initiate M-Pesa payment
            const paymentResponse = await mpesaService.initiateSTKPush(
                user.phone,
                amount,
                user.membership_id,
                `Gym Membership Renewal`
            );

            if (paymentResponse.ResponseCode === '0') {
                const duration = Date.now() - startTime;
                console.log('Membership renewal initiated successfully:', {
                    membershipId: user.membership_id,
                    duration: `${duration}ms`
                });

                res.json({
                    status: 'success',
                    message: 'Payment request sent to your phone. Please complete the transaction.',
                    data: {
                        membership_id: user.membership_id,
                        checkout_request_id: paymentResponse.CheckoutRequestID,
                        merchant_request_id: paymentResponse.MerchantRequestID
                    }
                });
            } else {
                console.error('M-Pesa renewal initiation failed:', paymentResponse);
                throw new Error(paymentResponse.ResponseDescription || 'Payment initiation failed');
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('Membership renewal failed:', {
                error: error.message,
                duration: `${duration}ms`
            });
            
            res.status(500).json({
                status: 'error',
                message: error.message || 'Renewal failed. Please try again.'
            });
        }
    }

    // Check membership status
    async checkStatus(req, res) {
        const startTime = Date.now();
        
        try {
            const { membership_id, phone } = req.query;

            console.log('Membership status check:', { membership_id, phone });

            if (!membership_id && !phone) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Membership ID or phone number is required'
                });
            }

            // Find user
            let user;
            if (membership_id) {
                user = await User.findByMembershipID(membership_id);
            } else if (phone) {
                user = await User.findByPhone(phone);
            }

            if (!user) {
                console.log('Status check - user not found');
                return res.status(404).json({
                    status: 'error',
                    message: 'Membership not found'
                });
            }

            // Calculate days remaining
            const now = new Date();
            const endDate = new Date(user.membership_end);
            const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            const isActive = user.status === 'active' && daysRemaining > 0;

            const duration = Date.now() - startTime;
            console.log('Membership status retrieved successfully:', {
                membershipId: user.membership_id,
                status: user.status,
                isActive,
                daysRemaining,
                duration: `${duration}ms`
            });

            res.json({
                status: 'success',
                data: {
                    user: {
                        name: user.name,
                        phone: user.phone,
                        membership_id: user.membership_id,
                        status: isActive ? 'active' : 'expired',
                        membership_type: user.membership_type,
                        membership_start: user.membership_start,
                        membership_end: user.membership_end,
                        days_remaining: isActive ? daysRemaining : 0,
                        rfid_card: user.rfid_card
                    }
                }
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('Membership status check failed:', {
                error: error.message,
                duration: `${duration}ms`
            });
            
            res.status(500).json({
                status: 'error',
                message: 'Failed to check membership status'
            });
        }
    }

    // Get all active members (admin)
    async getActiveMembers(req, res) {
        try {
            console.log('Admin request for active members');
            
            const members = await User.getActiveMembers();
            
            console.log('Active members retrieved:', { count: members.length });
            
            res.json({
                status: 'success',
                data: {
                    count: members.length,
                    members: members.map(member => ({
                        id: member.id,
                        name: member.name,
                        phone: member.phone,
                        membership_id: member.membership_id,
                        membership_end: member.membership_end,
                        rfid_card: member.rfid_card
                    }))
                }
            });

        } catch (error) {
            console.error('Failed to retrieve active members:', error.message);
            
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve active members'
            });
        }
    }
}

module.exports = new MemberController();