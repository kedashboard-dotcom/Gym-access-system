const { Logger } = require('../middleware/errorHandler');

class AxtraxMockService {
    constructor() {
        this.enabled = process.env.AXTRAX_ENABLED === 'true';
        this.mockUsers = [];
        Logger.info('Axtrax Mock Service initialized', { enabled: this.enabled });
    }

    async authenticate() {
        Logger.debug('Axtrax Mock: Authentication attempt');
        return new Promise((resolve) => {
            setTimeout(() => {
                Logger.info('Axtrax Mock: Authentication successful');
                resolve(true);
            }, 1000);
        });
    }

    async addUser(userData) {
        Logger.info('Axtrax Mock: Adding user', { 
            membershipId: userData.membership_id,
            name: userData.name 
        });

        return new Promise((resolve) => {
            setTimeout(() => {
                const mockUser = {
                    axtrax_user_id: 'MOCK_' + Date.now(),
                    rfid_card: this.generateMockRFID(),
                    userData: userData,
                    created_at: new Date().toISOString(),
                    status: 'active'
                };
                
                this.mockUsers.push(mockUser);
                
                Logger.info('Axtrax Mock: User added successfully', {
                    axtraxUserId: mockUser.axtrax_user_id,
                    rfidCard: mockUser.rfid_card
                });
                
                resolve({
                    success: true,
                    axtrax_user_id: mockUser.axtrax_user_id,
                    rfid_card: mockUser.rfid_card,
                    mock: true,
                    message: 'MOCK: User would be added to real AxtraxNG system'
                });
            }, 1500);
        });
    }

    async updateUser(userId, userData) {
        Logger.info('Axtrax Mock: Updating user', { userId, endDate: userData.membership_end });

        return new Promise((resolve) => {
            setTimeout(() => {
                const user = this.mockUsers.find(u => u.axtrax_user_id === userId);
                if (user) {
                    user.userData.membership_end = userData.membership_end;
                    user.updated_at = new Date().toISOString();
                }
                
                Logger.info('Axtrax Mock: User updated successfully', { userId });
                
                resolve({
                    success: true,
                    mock: true,
                    message: 'MOCK: User would be updated in real AxtraxNG system'
                });
            }, 1000);
        });
    }

    generateMockRFID() {
        // Generate a random 10-digit RFID number
        return 'RFID' + Math.random().toString().substr(2, 10);
    }

    async syncUserWithAxtrax(user) {
        Logger.info('Axtrax Mock: Syncing user', { 
            membershipId: user.membership_id,
            name: user.name 
        });

        if (user.axtrax_user_id) {
            return await this.updateUser(user.axtrax_user_id, user);
        } else {
            return await this.addUser(user);
        }
    }

    // Get mock users for testing
    getMockUsers() {
        return this.mockUsers;
    }

    // Clear mock data
    clearMockData() {
        this.mockUsers = [];
        Logger.info('Axtrax Mock: Data cleared');
    }
}

module.exports = new AxtraxMockService();