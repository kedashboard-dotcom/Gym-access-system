const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Validate environment first
require('./config/validateEnv')();

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV === 'development') return callback(null, true);
        
        const allowedOrigins = [
            'https://msingi.co.ke',
            'https://www.msingi.co.ke',
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('CORS blocked request from:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    console.log(`📥 ${req.method} ${req.url}`);
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`📤 ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });

    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        status: 'error',
        message: 'Too many requests from this IP'
    }
});
app.use(limiter);

// Serve static files
app.use(express.static(path.join(__dirname, '../')));

// Database connection
const db = require('./config/database');

// Test database connection
db.testConnection()
    .then(() => console.log('✅ Database connected successfully'))
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/access', require('./routes/access'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    console.log('Health check requested');
    res.status(200).json({
        status: 'success',
        message: 'Msingi Gym System API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: '1.0.0'
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    console.log('Test endpoint hit');
    res.json({
        status: 'success',
        message: 'API test endpoint working!',
        timestamp: new Date().toISOString()
    });
});

// Serve frontend pages
app.get('/', (req, res) => {
    console.log('Serving main page');
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/renewal', (req, res) => {
    console.log('Serving renewal page');
    res.sendFile(path.join(__dirname, '../renewal.html'));
});

app.get('/success', (req, res) => {
    console.log('Serving success page');
    res.sendFile(path.join(__dirname, '../success.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    console.warn('API endpoint not found:', req.originalUrl);
    res.status(404).json({
        status: 'error',
        message: 'API endpoint not found',
        available_endpoints: [
            'GET /api/health',
            'GET /api/test',
            'GET /api/members/status',
            'POST /api/members/register',
            'POST /api/members/renew',
            'POST /api/payments/mpesa-callback'
        ]
    });
});

// 404 handler for frontend routes
app.use('*', (req, res) => {
    console.log('Frontend route not found, serving index.html');
    res.status(404).sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Msingi Gym System running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log(`📱 M-Pesa: ${process.env.MPESA_ENVIRONMENT || 'sandbox'}`);
    console.log(`🔐 AxtraxNG: ${process.env.AXTRAX_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
});

module.exports = app;