const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ========================
// 🎯 BASIC API ROUTES
// ========================

// Health check endpoint - THIS SHOULD WORK NOW
app.get('/api/health', (req, res) => {
    console.log('✅ Health check endpoint hit!');
    res.json({
        status: 'success',
        message: '🎉 Msingi Gym API is WORKING!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    console.log('✅ Test endpoint hit!');
    res.json({
        status: 'success',
        message: '✅ Test endpoint is working!',
        data: {
            test: true,
            server: 'Node.js Express',
            time: new Date().toISOString()
        }
    });
});

// Membership status check
app.get('/api/members/status', (req, res) => {
    const { membership_id, phone } = req.query;
    console.log('✅ Status check:', { membership_id, phone });
    
    res.json({
        status: 'success',
        data: {
            user: {
                name: 'Test User',
                phone: phone || '254712345678',
                membership_id: membership_id || 'GYM001A1B2C',
                status: 'active',
                membership_type: 'standard',
                membership_start: new Date().toISOString(),
                membership_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                days_remaining: 29,
                rfid_card: '1234567890'
            }
        }
    });
});

// Member registration
app.post('/api/members/register', (req, res) => {
    console.log('✅ Registration attempt:', req.body);
    
    const { name, phone, amount, membership_type } = req.body;
    
    // Basic validation
    if (!name || !phone) {
        return res.status(400).json({
            status: 'error',
            message: 'Name and phone number are required'
        });
    }
    
    // Simulate successful registration
    const membership_id = 'GYM' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5).toUpperCase();
    
    res.json({
        status: 'success',
        message: 'Registration received successfully!',
        data: {
            membership_id: membership_id,
            checkout_request_id: 'req_' + Date.now(),
            merchant_request_id: 'mreq_' + Date.now(),
            note: 'This is a demo response. M-Pesa integration would be added later.'
        }
    });
});

// Membership renewal
app.post('/api/members/renew', (req, res) => {
    console.log('✅ Renewal attempt:', req.body);
    
    const { membership_id, phone, amount } = req.body;
    
    if (!membership_id && !phone) {
        return res.status(400).json({
            status: 'error',
            message: 'Membership ID or phone number is required'
        });
    }
    
    res.json({
        status: 'success',
        message: 'Renewal request received successfully!',
        data: {
            membership_id: membership_id || 'GYM001A1B2C',
            checkout_request_id: 'renew_' + Date.now(),
            merchant_request_id: 'mrenew_' + Date.now()
        }
    });
});

// ========================
// 🎯 SERVE STATIC FILES
// ========================

// Serve frontend files from root
app.use(express.static(path.join(__dirname, '../')));

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/renewal', (req, res) => {
    res.sendFile(path.join(__dirname, '../renewal.html'));
});

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, '../success.html'));
});

// ========================
// 🎯 ERROR HANDLING
// ========================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    console.log('❌ API endpoint not found:', req.originalUrl);
    res.status(404).json({
        status: 'error',
        message: 'API endpoint not found: ' + req.originalUrl,
        available_endpoints: [
            'GET /api/health',
            'GET /api/test',
            'GET /api/members/status',
            'POST /api/members/register',
            'POST /api/members/renew'
        ]
    });
});

// 404 handler for frontend routes
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
});

// ========================
// 🎯 START SERVER
// ========================

app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🚀 MSINGI GYM SYSTEM - NODE.JS SERVER STARTED!');
    console.log('='.repeat(60));
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 Node.js: ${process.version}`);
    console.log('='.repeat(60));
    console.log('✅ Available Endpoints:');
    console.log('   • GET  /api/health');
    console.log('   • GET  /api/test');
    console.log('   • GET  /api/members/status');
    console.log('   • POST /api/members/register');
    console.log('   • POST /api/members/renew');
    console.log('='.repeat(60));
    console.log('🌐 Test URL: https://msingi.co.ke/api/health');
    console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});