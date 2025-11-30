const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Msingi Gym System...');

// Force log environment variables for debugging
console.log('🔧 Environment Check:');
console.log('MPESA_CONSUMER_KEY:', process.env.MPESA_CONSUMER_KEY ? 'SET' : 'MISSING');
console.log('MPESA_ENVIRONMENT:', process.env.MPESA_ENVIRONMENT);
console.log('DB_HOST:', process.env.DB_HOST || 'Not set');
console.log('AXTRAX_ENABLED:', process.env.AXTRAX_ENABLED || 'false');

// Basic CORS - Allow all origins for now
app.use(cors());

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files from root
app.use(express.static(path.join(__dirname, '../')));

// Import database
const db = require('./config/database');

// Test database connection
db.testConnection()
    .then(() => console.log('✅ Database connected successfully'))
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        // Don't exit - continue without database
    });

// Import models
const User = require('./models/User');

// =====================
// AXTRAXNG TEST ENDPOINTS - ADD THESE FIRST
// =====================

// AxtraxNG Connection Test
app.get('/api/test-axtrax', async (req, res) => {
    try {
        const axtraxService = require('./utils/axtraxIntegration');
        
        console.log('🧪 Testing AxtraxNG connection...');
        
        // Test 1: Check if AxtraxNG is enabled
        const isEnabled = process.env.AXTRAX_ENABLED === 'true';
        
        if (!isEnabled) {
            return res.json({
                status: 'info',
                message: 'AxtraxNG is disabled in environment variables',
                suggestion: 'Set AXTRAX_ENABLED=true in your .env file',
                details: {
                    enabled: false,
                    baseURL: process.env.AXTRAX_BASE_URL || 'Not set',
                    environment: process.env.NODE_ENV
                }
            });
        }
        
        // Test 2: Try to authenticate
        console.log('🔧 Attempting AxtraxNG authentication...');
        const authResult = await axtraxService.authenticate();
        
        if (authResult) {
            res.json({
                status: 'success',
                message: 'AxtraxNG connection successful! ✅',
                details: {
                    enabled: true,
                    baseURL: process.env.AXTRAX_BASE_URL,
                    authenticated: true,
                    environment: process.env.NODE_ENV
                }
            });
        } else {
            res.json({
                status: 'warning',
                message: 'AxtraxNG authentication failed',
                details: {
                    enabled: true,
                    baseURL: process.env.AXTRAX_BASE_URL,
                    authenticated: false,
                    error: 'Check AxtraxNG credentials and server status'
                }
            });
        }
        
    } catch (error) {
        console.error('AxtraxNG test failed:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'AxtraxNG test failed',
            error: error.message,
            details: {
                enabled: process.env.AXTRAX_ENABLED === 'true',
                baseURL: process.env.AXTRAX_BASE_URL,
                suggestion: 'Check if AxtraxNG server is running and credentials are correct'
            }
        });
    }
});

// AxtraxNG Mock Test
app.get('/api/axtrax/mock-test', async (req, res) => {
    try {
        const axtraxMock = require('./utils/axtraxMock');
        
        // Test mock service
        const testUser = {
            membership_id: 'TEST001',
            name: 'Test User',
            phone: '254712345678',
            membership_start: new Date().toISOString(),
            membership_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        const result = await axtraxMock.addUser(testUser);
        const mockUsers = axtraxMock.getMockUsers();
        
        res.json({
            status: 'success',
            message: 'Axtrax Mock Service Test',
            result: result,
            mockUsers: mockUsers,
            details: {
                totalMockUsers: mockUsers.length,
                mockEnabled: true,
                note: 'This uses mock service since AXTRAX_ENABLED=false'
            }
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Mock test failed',
            error: error.message
        });
    }
});

// View Mock Users
app.get('/api/axtrax/mock-users', (req, res) => {
    try {
        const axtraxMock = require('./utils/axtraxMock');
        const users = axtraxMock.getMockUsers();
        
        res.json({
            status: 'success',
            data: {
                users: users,
                count: users.length
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to get mock users',
            error: error.message
        });
    }
});

// Clear Mock Data
app.delete('/api/axtrax/clear-mock', (req, res) => {
    try {
        const axtraxMock = require('./utils/axtraxMock');
        axtraxMock.clearMockData();
        
        res.json({
            status: 'success',
            message: 'Mock data cleared successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to clear mock data',
            error: error.message
        });
    }
});

// =====================
// DEBUG ENDPOINT
// =====================

app.post('/api/debug-registration', async (req, res) => {
    try {
        console.log('🔍 DEBUG: Registration attempt:', req.body);
        
        const { name, phone, amount = 2000 } = req.body;
        
        // Test M-Pesa service directly
        console.log('🔍 Testing M-Pesa service...');
        const mpesaService = require('./config/mpesa');
        
        console.log('🔍 M-Pesa Config:', {
            environment: mpesaService.environment,
            businessShortCode: mpesaService.businessShortCode,
            hasConsumerKey: !!mpesaService.consumerKey,
            hasConsumerSecret: !!mpesaService.consumerSecret
        });
        
        // Try to generate access token
        try {
            const token = await mpesaService.generateAccessToken();
            console.log('✅ M-Pesa Access Token:', token ? 'SUCCESS' : 'FAILED');
        } catch (tokenError) {
            console.error('❌ M-Pesa Token Error:', tokenError.message);
        }
        
        // Test AxtraxNG service
        console.log('🔍 Testing AxtraxNG service...');
        const axtraxService = require('./utils/axtraxIntegration');
        console.log('🔍 AxtraxNG Enabled:', process.env.AXTRAX_ENABLED === 'true');
        
        // Try STK Push
        try {
            const response = await mpesaService.initiateSTKPush(
                phone,
                amount,
                'TEST123',
                'Test Payment'
            );
            console.log('✅ M-Pesa STK Response:', response);
            
            res.json({
                status: 'success',
                message: 'Debug completed - M-Pesa and AxtraxNG tested',
                data: {
                    mpesa: response,
                    axtrax_enabled: process.env.AXTRAX_ENABLED === 'true',
                    axtrax_base_url: process.env.AXTRAX_BASE_URL
                }
            });
            
        } catch (stkError) {
            console.error('❌ M-Pesa STK Error:', stkError.message);
            res.json({
                status: 'error',
                message: 'M-Pesa failed: ' + stkError.message,
                axtrax_enabled: process.env.AXTRAX_ENABLED === 'true'
            });
        }
        
    } catch (error) {
        console.error('❌ Debug error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Debug failed: ' + error.message
        });
    }
});

// =====================
// API ROUTES
// =====================

// HEALTH CHECK
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        await db.query('SELECT 1 as test');
        
        res.json({
            status: 'success',
            message: 'Msingi Gym System API is fully operational',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            database: 'connected',
            axtrax_enabled: process.env.AXTRAX_ENABLED === 'true',
            services: {
                database: 'connected',
                mpesa: 'configured',
                axtrax: process.env.AXTRAX_ENABLED === 'true' ? 'enabled' : 'disabled'
            }
        });
    } catch (error) {
        res.json({
            status: 'success', 
            message: 'Msingi Gym System API is running (database offline)',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            axtrax_enabled: process.env.AXTRAX_ENABLED === 'true'
        });
    }
});

// MEMBER REGISTRATION (UPDATED WITH AXTRAXNG)
app.post('/api/members/register', async (req, res) => {
    try {
        console.log('Registration attempt:', req.body);
        
        const { name, phone, amount = 2000, membership_type = 'standard' } = req.body;

        // Validation
        if (!name || !phone) {
            return res.status(400).json({
                status: 'error',
                message: 'Name and phone number are required'
            });
        }

        // Basic phone validation
        const phoneRegex = /^(?:254|\+254|0)?(7[0-9]{8})$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                status: 'error',
                message: 'Please enter a valid Kenyan phone number'
            });
        }

        // Format phone
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('7') && formattedPhone.length === 9) {
            formattedPhone = '254' + formattedPhone;
        }

        // Check for existing active membership
        try {
            const existingUser = await User.findByPhone(formattedPhone);
            if (existingUser && existingUser.status === 'active' && new Date(existingUser.membership_end) > new Date()) {
                return res.status(400).json({
                    status: 'error',
                    message: 'You already have an active membership. Please use renewal.',
                    membership_id: existingUser.membership_id
                });
            }
        } catch (dbError) {
            console.log('Database check skipped:', dbError.message);
        }

        // Create user
        let user;
        try {
            user = await User.create({ 
                name: name.trim(), 
                phone: formattedPhone, 
                amount, 
                membership_type 
            });
            console.log('User created:', user.membership_id);
        } catch (userError) {
            // If database fails, create demo response
            user = {
                membership_id: 'GYM' + Date.now(),
                id: Math.floor(Math.random() * 1000),
                name: name,
                phone: formattedPhone
            };
            console.log('Using demo user due to DB error:', userError.message);
        }

        // M-Pesa Integration
        try {
            const mpesaService = require('./config/mpesa');
            const paymentResponse = await mpesaService.initiateSTKPush(
                formattedPhone,
                amount,
                user.membership_id,
                `Gym Membership - ${membership_type}`
            );

            if (paymentResponse.ResponseCode === '0') {
                // AXTRAXNG INTEGRATION - Sync user after successful payment initiation
                try {
                    const axtraxService = require('./utils/axtraxIntegration');
                    console.log('🔄 Attempting AxtraxNG sync for user:', user.membership_id);
                    
                    const axtraxResult = await axtraxService.syncUserWithAxtrax({
                        ...user,
                        membership_start: new Date().toISOString(),
                        membership_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    });
                    
                    console.log('✅ AxtraxNG sync result:', axtraxResult);
                    
                } catch (axtraxError) {
                    console.log('⚠️ AxtraxNG sync failed (non-critical):', axtraxError.message);
                    // Continue even if AxtraxNG fails
                }

                res.json({
                    status: 'success',
                    message: 'Payment request sent to your phone!',
                    data: {
                        membership_id: user.membership_id,
                        checkout_request_id: paymentResponse.CheckoutRequestID,
                        merchant_request_id: paymentResponse.MerchantRequestID,
                        axtrax_sync: 'attempted' // Indicate AxtraxNG was attempted
                    }
                });
            } else {
                throw new Error(paymentResponse.ResponseDescription || 'Payment failed');
            }
        } catch (mpesaError) {
            console.log('M-Pesa demo mode:', mpesaError.message);
            // Demo response if M-Pesa fails
            res.json({
                status: 'success',
                message: 'DEMO: Payment system ready - M-Pesa integration required',
                data: {
                    membership_id: user.membership_id,
                    checkout_request_id: 'demo_' + Date.now(),
                    axtrax_sync: 'demo_mode',
                    note: 'Real M-Pesa integration needs configuration'
                }
            });
        }

    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Registration failed. Please try again.'
        });
    }
});

// MEMBERSHIP RENEWAL (UPDATED WITH AXTRAXNG)
app.post('/api/members/renew', async (req, res) => {
    try {
        console.log('Renewal attempt:', req.body);
        
        const { membership_id, phone, amount = 2000 } = req.body;

        if (!membership_id && !phone) {
            return res.status(400).json({
                status: 'error',
                message: 'Membership ID or phone number is required'
            });
        }

        // Find user
        let user;
        try {
            if (membership_id) {
                user = await User.findByMembershipID(membership_id);
            } else if (phone) {
                user = await User.findByPhone(phone);
            }
        } catch (dbError) {
            console.log('Database lookup failed:', dbError.message);
            return res.status(404).json({
                status: 'error',
                message: 'Database temporarily unavailable'
            });
        }

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Membership not found'
            });
        }

        // M-Pesa Integration
        try {
            const mpesaService = require('./config/mpesa');
            const paymentResponse = await mpesaService.initiateSTKPush(
                user.phone,
                amount,
                user.membership_id,
                'Gym Membership Renewal'
            );

            if (paymentResponse.ResponseCode === '0') {
                // AXTRAXNG INTEGRATION - Update user access in AxtraxNG
                try {
                    const axtraxService = require('./utils/axtraxIntegration');
                    console.log('🔄 Attempting AxtraxNG update for renewal:', user.membership_id);
                    
                    const newEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                    const axtraxResult = await axtraxService.syncUserWithAxtrax({
                        ...user,
                        membership_end: newEndDate
                    });
                    
                    console.log('✅ AxtraxNG renewal update result:', axtraxResult);
                    
                } catch (axtraxError) {
                    console.log('⚠️ AxtraxNG renewal update failed (non-critical):', axtraxError.message);
                    // Continue even if AxtraxNG fails
                }

                res.json({
                    status: 'success',
                    message: 'Renewal payment request sent!',
                    data: {
                        membership_id: user.membership_id,
                        checkout_request_id: paymentResponse.CheckoutRequestID,
                        axtrax_update: 'attempted'
                    }
                });
            } else {
                throw new Error(paymentResponse.ResponseDescription);
            }
        } catch (mpesaError) {
            console.log('M-Pesa renewal demo mode');
            res.json({
                status: 'success',
                message: 'DEMO: Renewal system ready',
                data: {
                    membership_id: user.membership_id,
                    checkout_request_id: 'renew_demo_' + Date.now(),
                    axtrax_update: 'demo_mode'
                }
            });
        }

    } catch (error) {
        console.error('Renewal error:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Renewal failed'
        });
    }
});

// CHECK MEMBERSHIP STATUS
app.get('/api/members/status', async (req, res) => {
    try {
        const { membership_id, phone } = req.query;
        console.log('Status check:', { membership_id, phone });

        if (!membership_id && !phone) {
            return res.status(400).json({
                status: 'error',
                message: 'Membership ID or phone required'
            });
        }

        // Find user
        let user;
        try {
            if (membership_id) {
                user = await User.findByMembershipID(membership_id);
            } else if (phone) {
                user = await User.findByPhone(phone);
            }
        } catch (dbError) {
            console.log('Database status check failed');
            return res.status(503).json({
                status: 'error',
                message: 'Database temporarily unavailable'
            });
        }

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Membership not found'
            });
        }

        // Calculate status
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
                    days_remaining: isActive ? Math.max(0, daysRemaining) : 0,
                    rfid_card: user.rfid_card,
                    axtrax_user_id: user.axtrax_user_id
                }
            }
        });

    } catch (error) {
        console.error('Status check error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check status'
        });
    }
});

// CHECK MPESA PAYMENT STATUS
app.post('/api/check-mpesa', async (req, res) => {
    try {
        console.log('M-Pesa status check:', req.body);
        
        const { checkout_request_id } = req.body;

        if (!checkout_request_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Checkout request ID is required'
            });
        }

        const mpesaService = require('./config/mpesa');
        const status = await mpesaService.checkPaymentStatus(checkout_request_id);

        res.json({
            status: 'success',
            data: status
        });

    } catch (error) {
        console.error('M-Pesa status check error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check payment status: ' + error.message
        });
    }
});

// M-PESA CALLBACK HANDLER (UPDATED WITH AXTRAXNG)
app.post('/api/payments/mpesa-callback', async (req, res) => {
    try {
        console.log('M-Pesa callback received');
        
        const mpesaService = require('./config/mpesa');
        const callbackResult = mpesaService.handleCallback(req.body);

        if (callbackResult.success) {
            const { metadata } = callbackResult;
            
            try {
                // Find and update user
                const user = await User.findByMembershipID(metadata.PhoneNumber);
                if (user) {
                    const paymentData = {
                        mpesa_receipt: metadata.MpesaReceiptNumber,
                        amount: metadata.Amount,
                        payment_date: new Date()
                    };

                    const isRenewal = user.status === 'active';
                    if (isRenewal) {
                        await User.extendMembership(user.membership_id, paymentData);
                    } else {
                        await User.updateAfterPayment(user.membership_id, paymentData);
                    }
                    
                    console.log('Payment processed for:', user.membership_id);
                    
                    // AXTRAXNG INTEGRATION - Sync after successful payment
                    try {
                        const axtraxService = require('./utils/axtraxIntegration');
                        console.log('🔄 AxtraxNG sync after payment for:', user.membership_id);
                        
                        const axtraxResult = await axtraxService.syncUserWithAxtrax(user);
                        console.log('✅ AxtraxNG sync completed:', axtraxResult);
                        
                    } catch (axtraxError) {
                        console.log('⚠️ AxtraxNG sync in callback failed:', axtraxError.message);
                        // Non-critical - continue
                    }
                }
            } catch (dbError) {
                console.log('Payment update failed:', dbError.message);
            }

            res.json({ ResultCode: 0, ResultDesc: "Success" });
        } else {
            console.log('M-Pesa payment failed:', callbackResult.error);
            res.json({ ResultCode: 1, ResultDesc: "Failed" });
        }

    } catch (error) {
        console.error('Callback error:', error.message);
        res.json({ ResultCode: 1, ResultDesc: "Error" });
    }
});

// ACTIVE MEMBERS (ADMIN)
app.get('/api/members/active', async (req, res) => {
    try {
        const members = await User.getActiveMembers();
        res.json({
            status: 'success',
            data: {
                count: members.length,
                members: members.map(m => ({
                    name: m.name,
                    phone: m.phone,
                    membership_id: m.membership_id,
                    membership_end: m.membership_end,
                    rfid_card: m.rfid_card,
                    axtrax_user_id: m.axtrax_user_id
                }))
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to get active members'
        });
    }
});

// SYSTEM STATS (ADMIN)
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [totalMembers] = await db.query('SELECT COUNT(*) as count FROM users');
        const [activeMembers] = await db.query('SELECT COUNT(*) as count FROM users WHERE status = "active" AND membership_end > NOW()');
        
        res.json({
            status: 'success',
            data: {
                total_members: totalMembers[0].count,
                active_members: activeMembers[0].count,
                axtrax_enabled: process.env.AXTRAX_ENABLED === 'true',
                services: {
                    database: 'connected',
                    mpesa: 'configured', 
                    axtrax: process.env.AXTRAX_ENABLED === 'true' ? 'enabled' : 'disabled'
                }
            }
        });
    } catch (error) {
        res.json({
            status: 'success',
            data: {
                total_members: 0,
                active_members: 0,
                axtrax_enabled: process.env.AXTRAX_ENABLED === 'true',
                note: 'Database offline'
            }
        });
    }
});

// =====================
// FRONTEND ROUTES
// =====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/renewal', (req, res) => {
    res.sendFile(path.join(__dirname, '../renewal.html'));
});

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, '../success.html'));
});

// =====================
// ERROR HANDLING
// =====================

// 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'API endpoint not found: ' + req.originalUrl,
        available_endpoints: [
            'GET /api/health',
            'GET /api/test-axtrax',
            'GET /api/axtrax/mock-test',
            'GET /api/axtrax/mock-users',
            'DELETE /api/axtrax/clear-mock',
            'POST /api/debug-registration',
            'POST /api/members/register', 
            'POST /api/members/renew',
            'GET /api/members/status',
            'POST /api/check-mpesa',
            'GET /api/members/active',
            'POST /api/payments/mpesa-callback',
            'GET /api/admin/stats'
        ]
    });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', error.message);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
});

// =====================
// START SERVER
// =====================

app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🚀 MSINGI GYM SYSTEM FULLY OPERATIONAL');
    console.log('='.repeat(60));
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 Database: ${process.env.DB_NAME || 'Not configured'}`);
    console.log(`📍 AxtraxNG: ${process.env.AXTRAX_ENABLED === 'true' ? 'ENABLED' : 'DISABLED'}`);
    console.log('='.repeat(60));
    console.log('📋 Available Endpoints:');
    console.log('   • GET  /api/health');
    console.log('   • GET  /api/test-axtrax');
    console.log('   • GET  /api/axtrax/mock-test');
    console.log('   • GET  /api/axtrax/mock-users');
    console.log('   • DELETE /api/axtrax/clear-mock');
    console.log('   • POST /api/debug-registration');
    console.log('   • POST /api/members/register');
    console.log('   • POST /api/members/renew'); 
    console.log('   • GET  /api/members/status');
    console.log('   • POST /api/check-mpesa');
    console.log('   • GET  /api/members/active');
    console.log('   • POST /api/payments/mpesa-callback');
    console.log('   • GET  /api/admin/stats');
    console.log('='.repeat(60));
    console.log('✅ Server ready! Test AxtraxNG: https://msingi.co.ke/api/test-axtrax');
    console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
});