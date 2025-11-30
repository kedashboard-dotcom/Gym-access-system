const axios = require('axios');
const { Logger } = require('../middleware/errorHandler');
const axtraxMock = require('./axtraxMock');

class AxtraxIntegration {
    constructor() {
        this.baseURL = process.env.AXTRAX_BASE_URL || 'http://localhost:8080';
        this.username = process.env.AXTRAX_USERNAME;
        this.password = process.env.AXTRAX_PASSWORD;
        this.enabled = process.env.AXTRAX_ENABLED === 'true';
        this.authToken = null;
        
        Logger.info('Axtrax Integration initialized', {
            enabled: this.enabled,
            baseURL: this.baseURL,
            environment: process.env.NODE_ENV
        });
    }

    async authenticate() {
        if (!this.enabled) {
            Logger.info('AxtraxNG disabled, using mock service');
            return axtraxMock.authenticate();
        }

        try {
            Logger.debug('Authenticating with AxtraxNG', { baseURL: this.baseURL });
            
            const response = await axios.post(`${this.baseURL}/token`, {
                username: this.username,
                password: this.password
            }, {
                timeout: 10000
            });

            this.authToken = response.data.token;
            Logger.info('AxtraxNG authentication successful');
            return true;
        } catch (error) {
            Logger.warn('AxtraxNG authentication failed, falling back to mock', {
                error: error.message,
                baseURL: this.baseURL
            });
            
            // Fall back to mock service
            this.enabled = false;
            return axtraxMock.authenticate();
        }
    }

    async addUser(userData) {
        if (!this.enabled) {
            return axtraxMock.addUser(userData);
        }

        try {
            if (!this.authToken) {
                await this.authenticate();
            }

            const axtraxUser = {
                FirstName: userData.name,
                LastName: '',
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
                },
                timeout: 15000
            });

            Logger.info(`User ${userData.membership_id} added to AxtraxNG`);
            return {
                success: true,
                axtrax_user_id: response.data.UserID,
                rfid_card: axtraxUser.CardNumber
            };
        } catch (error) {
            Logger.error('AxtraxNG user addition failed, using mock', {
                error: error.message,
                membershipId: userData.membership_id
            });
            
            return axtraxMock.addUser(userData);
        }
    }

    async syncUserWithAxtrax(user) {
        Logger.info('Syncing user with access control', {
            membershipId: user.membership_id,
            enabled: this.enabled
        });

        try {
            if (user.axtrax_user_id) {
                return await this.updateUser(user.axtrax_user_id, user);
            } else {
                return await this.addUser(user);
            }
        } catch (error) {
            Logger.error('Axtrax sync failed, using mock', {
                error: error.message,
                membershipId: user.membership_id
            });
            return axtraxMock.syncUserWithAxtrax(user);
        }
    }

    // ... keep the rest of your existing methods
}

module.exports = new AxtraxIntegration();