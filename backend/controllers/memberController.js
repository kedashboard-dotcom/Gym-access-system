const User = require('../models/User');
const mpesaService = require('../config/mpesa');
const axtraxService = require('../utils/axtraxIntegration');
const { validatePhone, validateName } = require('../utils/validation');

class MemberController {
  // New member registration
  async register(req, res) {
    try {
      const { name, phone, amount = 2000, membership_type = 'standard' } = req.body;

      // Validation
      if (!name || !phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Name and phone number are required'
        });
      }

      if (!validateName(name)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please enter a valid name (letters and spaces only)'
        });
      }

      if (!validatePhone(phone)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please enter a valid Kenyan phone number (e.g., 254712345678)'
        });
      }

      // Check if user already has active membership
      const existingUser = await User.findByPhone(phone);
      if (existingUser && existingUser.status === 'active' && new Date(existingUser.membership_end) > new Date()) {
        return res.status(400).json({
          status: 'error',
          message: 'You already have an active membership. Please use membership renewal instead.',
          membership_id: existingUser.membership_id
        });
      }

      // Create user record
      const user = await User.create({ name, phone, amount, membership_type });
      
      // Initiate M-Pesa payment
      const paymentResponse = await mpesaService.initiateSTKPush(
        phone,
        amount,
        user.membership_id,
        `Gym Membership - ${membership_type}`
      );

      if (paymentResponse.ResponseCode === '0') {
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
        throw new Error(paymentResponse.ResponseDescription || 'Payment initiation failed');
      }

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Registration failed. Please try again.'
      });
    }
  }

  // Membership renewal
  async renew(req, res) {
    try {
      const { membership_id, phone, amount = 2000 } = req.body;

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
        return res.status(404).json({
          status: 'error',
          message: 'Membership not found. Please check your Membership ID or phone number.'
        });
      }

      // Initiate M-Pesa payment
      const paymentResponse = await mpesaService.initiateSTKPush(
        user.phone,
        amount,
        user.membership_id,
        `Gym Membership Renewal`
      );

      if (paymentResponse.ResponseCode === '0') {
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
        throw new Error(paymentResponse.ResponseDescription || 'Payment initiation failed');
      }

    } catch (error) {
      console.error('Renewal error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Renewal failed. Please try again.'
      });
    }
  }

  // Check membership status
  async checkStatus(req, res) {
    try {
      const { membership_id, phone } = req.query;

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
      console.error('Status check error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check membership status'
      });
    }
  }

  // Get all active members (admin)
  async getActiveMembers(req, res) {
    try {
      const members = await User.getActiveMembers();
      
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
      console.error('Get active members error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve active members'
      });
    }
  }
}

module.exports = new MemberController();