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

// Health check endpoint
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

// ========================
// 🎯 IMPORT ROUTES
// ========================

// Import route files
const memberRoutes = require('./routes/members');
const paymentRoutes = require('./routes/payments');  // ADD PAYMENT ROUTES

// Use routes
app.use('/api/members', memberRoutes);
app.use('/api/payments', paymentRoutes);  // ADD THIS LINE

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
            'POST /api/members/renew',
            'POST /api/payments/mpesa-callback',  // ADD THIS
            'POST /api/payments/validation',      // ADD THIS
            'POST /api/payments/confirmation'     // ADD THIS
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
    console.log('   • POST /api/payments/mpesa-callback');  // ADD THIS
    console.log('   • POST /api/payments/validation');      // ADD THIS
    console.log('   • POST /api/payments/confirmation');    // ADD THIS
    console.log('='.repeat(60));
    console.log('🌐 Test URL: https://msingi.co.ke/api/health');
    console.log('💳 Callback URL: https://msingi.co.ke/api/payments/mpesa-callback');
    console.log('='.repeat(60));
});