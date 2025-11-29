const { query } = require('../config/database');
const moment = require('moment');

class User {
  // Create new user
  static async create(userData) {
    const {
      name,
      phone,
      amount,
      membership_type = 'standard',
      payment_method = 'mpesa'
    } = userData;

    // Generate unique membership ID
    const membership_id = await this.generateMembershipID();
    
    const sql = `
      INSERT INTO users 
      (name, phone, amount, membership_type, payment_method, membership_id, status) 
      VALUES (?, ?, ?, ?, ?, ?, 'pending_payment')
    `;

    const result = await query(sql, [name, phone, amount, membership_type, payment_method, membership_id]);
    return { id: result.insertId, membership_id };
  }

  // Generate unique membership ID
  static async generateMembershipID() {
    const prefix = 'GYM';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    let membership_id = `${prefix}${timestamp}${random}`;
    
    // Check if ID already exists
    const checkSql = 'SELECT id FROM users WHERE membership_id = ?';
    const existing = await query(checkSql, [membership_id]);
    
    if (existing.length > 0) {
      // Regenerate if exists
      return this.generateMembershipID();
    }
    
    return membership_id;
  }

  // Find user by membership ID
  static async findByMembershipID(membership_id) {
    const sql = 'SELECT * FROM users WHERE membership_id = ?';
    const users = await query(sql, [membership_id]);
    return users[0] || null;
  }

  // Find user by phone
  static async findByPhone(phone) {
    const sql = 'SELECT * FROM users WHERE phone = ? ORDER BY created_at DESC LIMIT 1';
    const users = await query(sql, [phone]);
    return users[0] || null;
  }

  // Update user after payment
  static async updateAfterPayment(membership_id, paymentData) {
    const {
      mpesa_receipt,
      amount,
      payment_date
    } = paymentData;

    const membership_start = new Date();
    const membership_end = moment().add(30, 'days').format('YYYY-MM-DD HH:mm:ss');

    const sql = `
      UPDATE users 
      SET mpesa_receipt = ?, amount = ?, payment_date = ?, 
          membership_start = ?, membership_end = ?, status = 'active'
      WHERE membership_id = ? AND status = 'pending_payment'
    `;

    const result = await query(sql, [
      mpesa_receipt, amount, payment_date, 
      membership_start, membership_end, membership_id
    ]);

    return result.affectedRows > 0;
  }

  // Extend membership
  static async extendMembership(membership_id, paymentData) {
    const user = await this.findByMembershipID(membership_id);
    if (!user) throw new Error('User not found');

    const {
      mpesa_receipt,
      amount,
      payment_date
    } = paymentData;

    // Calculate new end date
    const currentEnd = user.membership_end && user.membership_end > new Date() 
      ? moment(user.membership_end)
      : moment();
    
    const membership_end = currentEnd.add(30, 'days').format('YYYY-MM-DD HH:mm:ss');

    const sql = `
      UPDATE users 
      SET mpesa_receipt = ?, amount = ?, payment_date = ?, 
          membership_end = ?, status = 'active',
          updated_at = CURRENT_TIMESTAMP
      WHERE membership_id = ?
    `;

    const result = await query(sql, [
      mpesa_receipt, amount, payment_date, membership_end, membership_id
    ]);

    return result.affectedRows > 0;
  }

  // Get active members
  static async getActiveMembers() {
    const sql = 'SELECT * FROM users WHERE status = "active" AND membership_end > NOW()';
    return await query(sql);
  }

  // Get expired members
  static async getExpiredMembers() {
    const sql = 'SELECT * FROM users WHERE status = "active" AND membership_end <= NOW()';
    return await query(sql);
  }

  // Update RFID card
  static async updateRFID(membership_id, rfid_card, axtrax_user_id = null) {
    const sql = 'UPDATE users SET rfid_card = ?, axtrax_user_id = ? WHERE membership_id = ?';
    const result = await query(sql, [rfid_card, axtrax_user_id, membership_id]);
    return result.affectedRows > 0;
  }

  // Check if phone exists
  static async phoneExists(phone) {
    const sql = 'SELECT id FROM users WHERE phone = ? AND status = "active" AND membership_end > NOW()';
    const users = await query(sql, [phone]);
    return users.length > 0;
  }
}

module.exports = User;