const axios = require('axios');
require('dotenv').config();

class AxtraxIntegration {
  constructor() {
    this.baseURL = process.env.AXTRAX_BASE_URL || 'http://localhost:8080';
    this.username = process.env.AXTRAX_USERNAME;
    this.password = process.env.AXTRAX_PASSWORD;
    this.enabled = process.env.AXTRAX_ENABLED === 'true';
    this.authToken = null;
  }

  // Authenticate with AxtraxNG
  async authenticate() {
    if (!this.enabled) {
      console.log('⚠️ AxtraxNG integration disabled');
      return true;
    }

    try {
      const response = await axios.post(`${this.baseURL}/token`, {
        username: this.username,
        password: this.password
      });

      this.authToken = response.data.token;
      console.log('✅ Authenticated with AxtraxNG');
      return true;
    } catch (error) {
      console.error('❌ AxtraxNG authentication failed:', error.message);
      throw new Error('AxtraxNG authentication failed');
    }
  }

  // Add user to AxtraxNG
  async addUser(userData) {
    if (!this.enabled) {
      console.log('⚠️ AxtraxNG integration disabled - skipping user addition');
      return { success: true, message: 'AxtraxNG disabled' };
    }

    try {
      if (!this.authToken) {
        await this.authenticate();
      }

      const axtraxUser = {
        FirstName: userData.name,
        LastName: '', // You might want to split name if needed
        CardNumber: userData.rfid_card || await this.generateRFID(),
        StartDate: userData.membership_start,
        EndDate: userData.membership_end,
        IsActive: true,
        UserType: 'Member'
      };

      const response = await axios.post(`${this.baseURL}/api/User/AddUser`, axtraxUser, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ User ${userData.membership_id} added to AxtraxNG`);
      return {
        success: true,
        axtrax_user_id: response.data.UserID,
        rfid_card: axtraxUser.CardNumber
      };
    } catch (error) {
      console.error('❌ AxtraxNG user addition failed:', error.message);
      throw new Error('Failed to add user to access control system');
    }
  }

  // Update user in AxtraxNG
  async updateUser(userId, userData) {
    if (!this.enabled) {
      console.log('⚠️ AxtraxNG integration disabled - skipping user update');
      return { success: true, message: 'AxtraxNG disabled' };
    }

    try {
      if (!this.authToken) {
        await this.authenticate();
      }

      const updateData = {
        EndDate: userData.membership_end,
        IsActive: true
      };

      const response = await axios.put(`${this.baseURL}/api/User/UpdateUser/${userId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ User ${userId} updated in AxtraxNG`);
      return { success: true };
    } catch (error) {
      console.error('❌ AxtraxNG user update failed:', error.message);
      throw new Error('Failed to update user in access control system');
    }
  }

  // Generate RFID card number
  async generateRFID() {
    // Generate a random 10-digit RFID number
    const rfid = Math.random().toString().slice(2, 12);
    return rfid.padEnd(10, '0');
  }

  // Sync user with AxtraxNG (main method to call)
  async syncUserWithAxtrax(user) {
    try {
      if (user.axtrax_user_id) {
        // Update existing user
        return await this.updateUser(user.axtrax_user_id, user);
      } else {
        // Add new user
        const result = await this.addUser(user);
        
        // Update user record with RFID and Axtrax user ID
        if (result.success && result.axtrax_user_id) {
          // This would update the user in the database
          // await User.updateRFID(user.membership_id, result.rfid_card, result.axtrax_user_id);
        }
        
        return result;
      }
    } catch (error) {
      console.error('Axtrax sync error:', error);
      throw error;
    }
  }
}

module.exports = new AxtraxIntegration();