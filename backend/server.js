const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Msingi Gym System...');

// Force log environment variables for debugging
console.log('🔧 Environment Check:');
console.log('MPESA_ENVIRONMENT:', process.env.MPESA_ENVIRONMENT);
console.log('MPESA_CONSUMER_KEY:', process.env.MPESA_CONSUMER_KEY ? 'SET' : 'MISSING');
console.log('DB_HOST:', process.env.DB_HOST || 'Not set');
console.log('AXTRAX_ENABLED:', process.env.AXTRAX_ENABLED || 'false');
console.log('MPESA_CALLBACK_URL:', process.env.MPESA_CALLBACK_URL || 'Not set');

// Basic CORS - Allow all origins for now
app.use(cors());

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logging with detailed M-Pesa callback logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.url}`);
    
    // Special logging for M-Pesa callbacks
    if (req.url.includes('mpesa-callback')) {
        console.log('🔔 M-Pesa Callback Detected!');
        console.log('   IP Address:', req.ip);
        console.log('   User Agent:', req.headers['user-agent']);
        
        if (req.method === 'GET') {
            console.log('   📥 GET Request for validation');
            console.log('   Query Params:', req.query);
        }
        
        if (req.method === 'POST') {
            console.log('   📥 POST Request for payment callback');
            // Capture POST body
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                console.log('   📦 POST Body:', body);
                try {
                    req.body = JSON.parse(body);
                } catch (e) {
                    req.body = body;
                }
                next();
            });
            return;
        }
    }
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
// AXTRAXNG TEST ENDPOINTS
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
// M-PESA CALLBACK ENDPOINTS (CRITICAL FIX)
// =====================

// M-Pesa sends GET request first to validate callback URL
app.get('/api/payments/mpesa-callback', (req, res) => {
    console.log('✅ M-Pesa callback URL validation received (GET request)');
    console.log('   Query params:', req.query);
    console.log('   Validation from IP:', req.ip);
    
    // Send success response to validate the endpoint
    res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback URL is valid and ready to receive payments",
        validation: {
            timestamp: new Date().toISOString(),
            method: 'GET',
            validated: true,
            server: 'Msingi Gym System'
        }
    });
});

// M-Pesa callback handler for actual payments (POST)
app.post('/api/payments/mpesa-callback', async (req, res) => {
    try {
        console.log('💰 M-Pesa payment callback received (POST request)');
        console.log('   Request Body:', JSON.stringify(req.body, null, 2));
        
        const mpesaService = require('./config/mpesa');
        const callbackResult = mpesaService.handleCallback(req.body);

        if (callbackResult.success) {
            const { metadata } = callbackResult;
            
            console.log('✅ Payment successful:', {
                receipt: metadata.mpesaReceiptNumber,
                amount: metadata.amount,
                phone: metadata.phoneNumber
            });
            
            try {
                // Find and update user by phone number - FIXED: Look by membership_id not phone
                // The callback metadata has phone number, but we need to find user
                // Try to find by phone first
                let user = await User.findByPhone(metadata.phoneNumber);
                
                if (!user) {
                    // If not found by phone, try to find any pending payment user
                    const [pendingUsers] = await db.query(
                        "SELECT * FROM users WHERE status = 'pending_payment' ORDER BY created_at DESC LIMIT 1"
                    );
                    user = pendingUsers[0];
                }
                
                if (user) {
                    console.log('👤 User found:', user.membership_id, user.name);
                    
                    const paymentData = {
                        mpesa_receipt: metadata.mpesaReceiptNumber,
                        amount: metadata.amount,
                        payment_date: new Date(metadata.transactionDate || new Date())
                    };

                    const isRenewal = user.status === 'active';
                    if (isRenewal) {
                        await User.extendMembership(user.membership_id, paymentData);
                        console.log('🔄 Membership extended for:', user.membership_id);
                    } else {
                        await User.updateAfterPayment(user.membership_id, paymentData);
                        console.log('🆕 New membership activated for:', user.membership_id);
                    }
                    
                    // AXTRAXNG INTEGRATION - Sync after successful payment
                    try {
                        const axtraxService = require('./utils/axtraxIntegration');
                        console.log('🔄 Attempting AxtraxNG sync for:', user.membership_id);
                        
                        const axtraxResult = await axtraxService.syncUserWithAxtrax(user);
                        console.log('✅ AxtraxNG sync completed:', axtraxResult);
                        
                    } catch (axtraxError) {
                        console.log('⚠️ AxtraxNG sync in callback failed (non-critical):', axtraxError.message);
                    }
                } else {
                    console.log('❌ User not found for phone:', metadata.phoneNumber);
                    // Create a log for manual follow-up
                    console.log('⚠️ Manual check required: Payment received but user not found');
                }
            } catch (dbError) {
                console.log('❌ Payment update failed:', dbError.message);
            }

            res.json({ 
                ResultCode: 0, 
                ResultDesc: "Success",
                processed: true,
                timestamp: new Date().toISOString()
            });
        } else {
            console.log('❌ M-Pesa payment failed:', callbackResult.error);
            res.json({ 
                ResultCode: 1, 
                ResultDesc: "Failed",
                error: callbackResult.error
            });
        }

    } catch (error) {
        console.error('🔥 Callback processing error:', error.message);
        res.json({ 
            ResultCode: 1, 
            ResultDesc: "Error processing callback"
        });
    }
});

// Test M-Pesa callback endpoint
app.post('/api/payments/test-callback', async (req, res) => {
    try {
        console.log('🧪 Test callback received');
        
        // Create test callback data
        const testData = {
            Body: {
                stkCallback: {
                    MerchantRequestID: "test-" + Date.now(),
                    CheckoutRequestID: "test-checkout-" + Date.now(),
                    ResultCode: 0,
                    ResultDesc: "The service request is processed successfully.",
                    CallbackMetadata: {
                        Item: [
                            { Name: "Amount", Value: 2 },
                            { Name: "MpesaReceiptNumber", Value: "TEST" + Date.now() },
                            { Name: "TransactionDate", Value: new Date().toISOString().replace(/[-:]/g, '').split('.')[0] },
                            { Name: "PhoneNumber", Value: "254712345678" }
                        ]
                    }
                }
            }
        };
        
        console.log('Test data:', JSON.stringify(testData, null, 2));
        
        // Process the test callback
        const mpesaService = require('./config/mpesa');
        const callbackResult = mpesaService.handleCallback(testData);
        
        res.json({
            status: 'success',
            message: 'Test callback processed',
            callbackResult: callbackResult,
            testData: testData
        });
        
    } catch (error) {
        console.error('Test callback error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// =====================
// DEBUG & TEST ENDPOINTS
// =====================

app.post('/api/debug-registration', async (req, res) => {
    try {
        console.log('🔍 DEBUG: Registration attempt:', req.body);
        
        const { name, phone, amount = 2 } = req.body;
        
        // Test M-Pesa service directly
        console.log('🔍 Testing M-Pesa service...');
        const mpesaService = require('./config/mpesa');
        
        console.log('🔍 M-Pesa Config:', {
            environment: mpesaService.environment,
            businessShortCode: mpesaService.businessShortCode,
            hasConsumerKey: !!mpesaService.consumerKey,
            hasConsumerSecret: !!mpesaService.consumerSecret,
            callbackURL: mpesaService.callbackURL
        });
        
        // Try to generate access token
        try {
            const token = await mpesaService.generateAccessToken();
            console.log('✅ M-Pesa Access Token:', token ? 'SUCCESS' : 'FAILED');
        } catch (tokenError) {
            console.error('❌ M-Pesa Token Error:', tokenError.message);
        }
        
        // Test STK Push with 2 bob
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
                message: 'Debug completed - M-Pesa tested',
                data: {
                    mpesa: response,
                    callback_url: mpesaService.callbackURL
                }
            });
            
        } catch (stkError) {
            console.error('❌ M-Pesa STK Error:', stkError.message);
            res.json({
                status: 'error',
                message: 'M-Pesa failed: ' + stkError.message,
                callback_url: mpesaService.callbackURL
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

// Manual payment fix endpoint
app.post('/api/fix-payment', async (req, res) => {
    try {
        const { membership_id, mpesa_receipt, amount = 2 } = req.body;
        
        if (!membership_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Membership ID is required'
            });
        }
        
        console.log(`🔧 Manual payment fix for: ${membership_id}`);
        
        const paymentData = {
            mpesa_receipt: mpesa_receipt || 'MANUAL_' + Date.now(),
            amount: amount,
            payment_date: new Date()
        };
        
        const user = await User.findByMembershipID(membership_id);
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        
        const isRenewal = user.status === 'active';
        let result;
        
        if (isRenewal) {
            result = await User.extendMembership(membership_id, paymentData);
            console.log('🔄 Manual membership extension');
        } else {
            result = await User.updateAfterPayment(membership_id, paymentData);
            console.log('🆕 Manual new membership activation');
        }
        
        if (result) {
            res.json({
                status: 'success',
                message: `Payment manually ${isRenewal ? 'extended' : 'activated'}`,
                data: {
                    membership_id: membership_id,
                    status: 'active',
                    updated: true
                }
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'Failed to update payment'
            });
        }
        
    } catch (error) {
        console.error('Manual fix error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
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
            mpesa_configured: !!process.env.MPESA_CONSUMER_KEY,
            callback_url: process.env.MPESA_CALLBACK_URL,
            services: {
                database: 'connected',
                mpesa: 'configured',
                axtrax: process.env.AXTRAX_ENABLED === 'true' ? 'enabled' : 'disabled',
                callback_validation: 'GET /api/payments/mpesa-callback available'
            }
        });
    } catch (error) {
        res.json({
            status: 'success', 
            message: 'Msingi Gym System API is running (database offline)',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            axtrax_enabled: process.env.AXTRAX_ENABLED === 'true',
            mpesa_configured: !!process.env.MPESA_CONSUMER_KEY
        });
    }
});

// MEMBER REGISTRATION
app.post('/api/members/register', async (req, res) => {
    try {
        console.log('📝 Registration attempt:', req.body);
        
        const { name, phone, amount = 2, membership_type = 'standard' } = req.body;

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
                message: 'Please enter a valid Kenyan phone number (e.g., 254712345678)'
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
            console.log('✅ User created:', user.membership_id);
        } catch (userError) {
            console.error('❌ User creation failed:', userError.message);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to create user record. Please try again.'
            });
        }

        // M-Pesa Integration
        try {
            const mpesaService = require('./config/mpesa');
            console.log('📱 Initiating M-Pesa payment for:', formattedPhone);
            
            const paymentResponse = await mpesaService.initiateSTKPush(
                formattedPhone,
                amount,
                user.membership_id,
                `Gym Membership - ${membership_type}`
            );

            if (paymentResponse.ResponseCode === '0') {
                console.log('✅ M-Pesa payment initiated:', paymentResponse);
                
                res.json({
                    status: 'success',
                    message: 'Payment request sent to your phone! Please complete the M-Pesa transaction.',
                    data: {
                        membership_id: user.membership_id,
                        checkout_request_id: paymentResponse.CheckoutRequestID,
                        merchant_request_id: paymentResponse.MerchantRequestID
                    }
                });
            } else {
                console.error('❌ M-Pesa initiation failed:', paymentResponse);
                throw new Error(paymentResponse.ResponseDescription || 'Payment initiation failed');
            }
        } catch (mpesaError) {
            console.error('❌ M-Pesa error:', mpesaError.message);
            
            // Update user status to indicate payment initiation failed
            try {
                await db.execute(
                    "UPDATE users SET status = 'cancelled' WHERE membership_id = ?",
                    [user.membership_id]
                );
            } catch (updateError) {
                console.log('Failed to update user status:', updateError.message);
            }
            
            res.status(500).json({
                status: 'error',
                message: 'Failed to initiate payment: ' + mpesaError.message,
                note: 'Please check your M-Pesa credentials and try again'
            });
        }

    } catch (error) {
        console.error('❌ Registration error:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Registration failed. Please try again.'
        });
    }
});

// MEMBERSHIP RENEWAL
app.post('/api/members/renew', async (req, res) => {
    try {
        console.log('🔄 Renewal attempt:', req.body);
        
        const { membership_id, phone, amount = 2 } = req.body;

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
                message: 'Membership not found. Please check your Membership ID or phone number.'
            });
        }

        // M-Pesa Integration
        try {
            const mpesaService = require('./config/mpesa');
            console.log('📱 Initiating M-Pesa renewal for:', user.phone);
            
            const paymentResponse = await mpesaService.initiateSTKPush(
                user.phone,
                amount,
                user.membership_id,
                'Gym Membership Renewal'
            );

            if (paymentResponse.ResponseCode === '0') {
                console.log('✅ M-Pesa renewal initiated:', paymentResponse);
                
                res.json({
                    status: 'success',
                    message: 'Renewal payment request sent to your phone!',
                    data: {
                        membership_id: user.membership_id,
                        checkout_request_id: paymentResponse.CheckoutRequestID
                    }
                });
            } else {
                console.error('❌ M-Pesa renewal failed:', paymentResponse);
                throw new Error(paymentResponse.ResponseDescription || 'Renewal failed');
            }
        } catch (mpesaError) {
            console.error('❌ M-Pesa renewal error:', mpesaError.message);
            res.status(500).json({
                status: 'error',
                message: 'Renewal failed: ' + mpesaError.message
            });
        }

    } catch (error) {
        console.error('❌ Renewal error:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Renewal failed. Please try again.'
        });
    }
});

// CHECK MEMBERSHIP STATUS
app.get('/api/members/status', async (req, res) => {
    try {
        const { membership_id, phone } = req.query;
        console.log('🔍 Status check:', { membership_id, phone });

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
            console.log('Database status check failed:', dbError.message);
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
        console.error('❌ Status check error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check status'
        });
    }
});

// CHECK MPESA PAYMENT STATUS
app.post('/api/check-mpesa', async (req, res) => {
    try {
        console.log('🔍 M-Pesa status check:', req.body);
        
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
        console.error('❌ M-Pesa status check error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check payment status: ' + error.message
        });
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
        const [pendingPayments] = await db.query('SELECT COUNT(*) as count FROM users WHERE status = "pending_payment"');
        
        res.json({
            status: 'success',
            data: {
                total_members: totalMembers[0].count,
                active_members: activeMembers[0].count,
                pending_payments: pendingPayments[0].count,
                axtrax_enabled: process.env.AXTRAX_ENABLED === 'true',
                services: {
                    database: 'connected',
                    mpesa: 'configured', 
                    axtrax: process.env.AXTRAX_ENABLED === 'true' ? 'enabled' : 'disabled',
                    callback_endpoint: 'GET /api/payments/mpesa-callback available'
                }
            }
        });
    } catch (error) {
        res.json({
            status: 'success',
            data: {
                total_members: 0,
                active_members: 0,
                pending_payments: 0,
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

// New test pages
app.get('/test-callback', (req, res) => {
    res.sendFile(path.join(__dirname, '../test-callback.html'));
});

app.get('/api-test', (req, res) => {
    res.sendFile(path.join(__dirname, '../api-test.html'));
});

// =====================
// ERROR HANDLING
// =====================

// 404 for API routes
app.use('/api/*', (req, res) => {
    console.log(`❌ 404: API endpoint not found: ${req.originalUrl}`);
    res.status(404).json({
        status: 'error',
        message: 'API endpoint not found: ' + req.originalUrl,
        method: req.method,
        available_endpoints: [
            'GET /api/health',
            'GET /api/test-axtrax',
            'GET /api/axtrax/mock-test',
            'GET /api/axtrax/mock-users',
            'DELETE /api/axtrax/clear-mock',
            'POST /api/debug-registration',
            'POST /api/fix-payment',
            'POST /api/members/register', 
            'POST /api/members/renew',
            'GET /api/members/status',
            'POST /api/check-mpesa',
            'GET /api/members/active',
            'GET /api/payments/mpesa-callback',
            'POST /api/payments/mpesa-callback',
            'POST /api/payments/test-callback',
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
    console.error('🔥 Global error:', error.message);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
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
    console.log(`📍 M-Pesa Mode: ${process.env.MPESA_ENVIRONMENT || 'Not set'}`);
    console.log(`📍 AxtraxNG: ${process.env.AXTRAX_ENABLED === 'true' ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📍 Callback URL: ${process.env.MPESA_CALLBACK_URL || 'Not set'}`);
    console.log('='.repeat(60));
    console.log('📋 Available Endpoints:');
    console.log('   • GET  /api/health');
    console.log('   • GET  /api/test-axtrax');
    console.log('   • GET  /api/axtrax/mock-test');
    console.log('   • GET  /api/axtrax/mock-users');
    console.log('   • DELETE /api/axtrax/clear-mock');
    console.log('   • POST /api/debug-registration');
    console.log('   • POST /api/fix-payment');
    console.log('   • POST /api/members/register');
    console.log('   • POST /api/members/renew'); 
    console.log('   • GET  /api/members/status');
    console.log('   • POST /api/check-mpesa');
    console.log('   • GET  /api/members/active');
    console.log('   • GET  /api/payments/mpesa-callback  ← M-Pesa validation');
    console.log('   • POST /api/payments/mpesa-callback  ← M-Pesa payments');
    console.log('   • POST /api/payments/test-callback  ← Test callback');
    console.log('   • GET  /api/admin/stats');
    console.log('='.repeat(60));
    console.log('🌐 Test Pages:');
    console.log('   • /test-callback  ← Callback tester');
    console.log('   • /api-test       ← API tester');
    console.log('='.repeat(60));
    console.log('✅ Server ready! Test your system now.');
    console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
});