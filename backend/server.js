const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Parse JSON bodies
app.use(express.json());

// Simple request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// HEALTH CHECK - This should ALWAYS work
app.get('/api/health', (req, res) => {
    console.log('✅ Health check received');
    res.json({
        status: 'success',
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// TEST ENDPOINT
app.get('/api/test', (req, res) => {
    console.log('✅ Test endpoint hit');
    res.json({
        status: 'success', 
        message: 'Test endpoint working!',
        data: { test: true }
    });
});

// SIMPLE REGISTRATION ENDPOINT
app.post('/api/members/register', (req, res) => {
    console.log('✅ Registration attempt:', req.body);
    
    const { name, phone, amount = 2000 } = req.body;
    
    // Basic validation
    if (!name || !phone) {
        return res.status(400).json({
            status: 'error',
            message: 'Name and phone are required'
        });
    }
    
    // Generate fake membership ID
    const membership_id = 'GYM' + Date.now();
    
    res.json({
        status: 'success',
        message: 'DEMO: Registration would process here',
        data: {
            membership_id: membership_id,
            checkout_request_id: 'demo_' + Date.now(),
            name: name,
            phone: phone,
            amount: amount
        }
    });
});

// Serve static files from root
app.use(express.static(require('path').join(__dirname, '../')));

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(require('path').join(__dirname, '../index.html'));
});

app.get('/renewal', (req, res) => {
    res.sendFile(require('path').join(__dirname, '../renewal.html'));
});

app.get('/success', (req, res) => {
    res.sendFile(require('path').join(__dirname, '../success.html'));
});

// Catch-all for API routes
app.all('/api/*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'API endpoint not found: ' + req.url,
        available: ['GET /api/health', 'GET /api/test', 'POST /api/members/register']
    });
});

// Catch-all for frontend - serve index.html
app.get('*', (req, res) => {
    res.sendFile(require('path').join(__dirname, '../index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🚀 SIMPLE SERVER STARTED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Health: http://localhost:${PORT}/api/health`);
    console.log(`📍 Test: http://localhost:${PORT}/api/test`);
    console.log('='.repeat(50));
    console.log('✅ Server is ready to accept requests!');
    console.log('='.repeat(50));
});

// Handle errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});