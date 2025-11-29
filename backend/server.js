const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Logger } = require('./middleware/errorHandler');
require('dotenv').config();

// Validate environment first
require('./config/validateEnv')();

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow all origins in development, restrict in production
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        // In production, allow your domain and any subdomains
        const allowedOrigins = [
            'https://msingi.co.ke',
            'https://www.msingi.co.ke',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:8000',
            'http://127.0.0.1:8000'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            Logger.warn('CORS blocked request', { origin, allowedOrigins });
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://msingi.co.ke", "https://sandbox.safaricom.co.ke", "https://api.safaricom.co.ke"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parsing middleware
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            Logger.error('Invalid JSON in request body', { 
                url: req.url,
                method: req.method,
                error: e.message
            });
            throw new Error('Invalid JSON');
        }
    }
}));

app.use(express.urlencoded({ 
    extended: true,
    limit: '10mb'
}));

// Request logging middleware - Log all incoming requests
app.use((req, res, next) => {
    const start = Date.now();
    
    // Skip logging for health checks to reduce noise
    if (req.url === '/api/health' || req.url === '/health') {
        return next();
    }

    Logger.debug('Incoming Request', {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type')
    });

    // Hook into response finish to log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            contentLength: res.get('Content-Length') || '0'
        };

        if (res.statusCode >= 400) {
            Logger.warn('Request Completed with Error', logData);
        } else if (res.statusCode >= 300) {
            Logger.info('Request Redirected', logData);
        } else {
            Logger.debug('Request Completed Successfully', logData);
        }
    });

    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Different limits for prod vs dev
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again later.'
    },
    handler: (req, res) => {
        Logger.warn('Rate limit exceeded', { 
            ip: req.ip, 
            url: req.url,
            method: req.method
        });
        res.status(429).json({
            status: 'error',
            message: 'Too many requests from this IP, please try again later.'
        });
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// More aggressive rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        status: 'error',
        message: 'Too many authentication attempts, please try again later.'
    },
    handler: (req, res) => {
        Logger.warn('Auth rate limit exceeded', { 
            ip: req.ip, 
            url: req.url 
        });
        res.status(429).json({
            status: 'error',
            message: 'Too many authentication attempts, please try again later.'
        });
    }
});

// Serve static files from root directory
app.use(express.static(path.join(__dirname, '../'), {
    index: false, // Don't serve index.html for directories
    dotfiles: 'ignore', // Ignore dotfiles
    etag: true,
    lastModified: true,
    maxAge: '1d'
}));

// Database connection
const db = require('./config/database');

// Test database connection with retry logic
const connectDBWithRetry = async (retries = 5, delay = 5000) => {
    try {
        await db.testConnection();
        Logger.info('Database connection established successfully');
        return true;
    } catch (error) {
        Logger.error(`Database connection failed (${retries} retries left)`, {
            error: error.message,
            config: {
                host: process.env.DB_HOST,
                database: process.env.DB_NAME,
                user: process.env.DB_USER
            }
        });
        
        if (retries > 0) {
            Logger.info(`Retrying database connection in ${delay}ms...`);
            setTimeout(() => connectDBWithRetry(retries - 1, delay), delay);
        } else {
            Logger.error('Could not connect to database after multiple attempts. Shutting down...');
            process.exit(1);
        }
    }
};

// Import routes
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const paymentRoutes = require('./routes/payments');
const accessRoutes = require('./routes/access');
const logRoutes = require('./routes/logs');

// Apply auth rate limiting to auth routes
app.use('/api/auth', authLimiter);

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/logs', logRoutes);

// Health check endpoint - Detailed system status
app.get('/api/health', async (req, res) => {
    const healthCheck = {
        status: 'success',
        message: 'Msingi Gym System API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: '1.0.0',
        system: {
            nodeVersion: process.version,
            platform: process.platform,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        },
        services: {}
    };

    try {
        // Test database connection
        await db.query('SELECT 1 as db_status');
        healthCheck.services.database = 'healthy';
        
        // Test if we can read from users table
        const [users] = await db.query('SELECT COUNT(*) as user_count FROM users');
        healthCheck.services.database_details = {
            user_count: users[0].user_count,
            status: 'healthy'
        };
    } catch (dbError) {
        healthCheck.services.database = 'unhealthy';
        healthCheck.services.database_error = dbError.message;
        healthCheck.status = 'error';
        healthCheck.message = 'System experiencing issues';
        
        Logger.error('Health check failed - database error', { error: dbError.message });
    }

    // Check M-Pesa configuration
    if (process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET) {
        healthCheck.services.mpesa = 'configured';
    } else {
        healthCheck.services.mpesa = 'not_configured';
    }

    // Check AxtraxNG configuration
    if (process.env.AXTRAX_ENABLED === 'true') {
        healthCheck.services.axtraxng = 'enabled';
    } else {
        healthCheck.services.axtraxng = 'disabled';
    }

    const statusCode = healthCheck.status === 'success' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
});

// Simple health check for load balancers
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Serve frontend pages with explicit routes
app.get('/', (req, res) => {
    Logger.debug('Serving main page', { 
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/renewal', (req, res) => {
    Logger.debug('Serving renewal page', { 
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    res.sendFile(path.join(__dirname, '../renewal.html'));
});

app.get('/success', (req, res) => {
    Logger.debug('Serving success page', { 
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    res.sendFile(path.join(__dirname, '../success.html'));
});

// API documentation route
app.get('/api/docs', (req, res) => {
    Logger.debug('Serving API documentation', { ip: req.ip });
    res.json({
        status: 'success',
        message: 'API Documentation',
        endpoints: {
            health: {
                method: 'GET',
                path: '/api/health',
                description: 'System health check'
            },
            register: {
                method: 'POST',
                path: '/api/members/register',
                description: 'Register new member',
                body: {
                    name: 'string',
                    phone: 'string',
                    amount: 'number',
                    membership_type: 'string'
                }
            },
            renew: {
                method: 'POST',
                path: '/api/members/renew',
                description: 'Renew membership',
                body: {
                    membership_id: 'string OR phone: string',
                    amount: 'number'
                }
            },
            status: {
                method: 'GET',
                path: '/api/members/status?membership_id=XXX OR phone=XXX',
                description: 'Check membership status'
            },
            mpesa_callback: {
                method: 'POST',
                path: '/api/payments/mpesa-callback',
                description: 'M-Pesa payment callback (automatically called by Safaricom)'
            }
        }
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    Logger.warn('API endpoint not found', { 
        method: req.method, 
        url: req.originalUrl,
        ip: req.ip,
        headers: req.headers
    });
    
    res.status(404).json({
        status: 'error',
        message: 'API endpoint not found',
        requested: req.originalUrl,
        available_endpoints: [
            '/api/health',
            '/api/members/register',
            '/api/members/renew',
            '/api/members/status',
            '/api/payments/mpesa-callback',
            '/api/auth/stats',
            '/api/docs'
        ]
    });
});

// 404 handler for frontend routes - serve index.html for SPA routing
app.use('*', (req, res) => {
    // Only log 404s for non-API routes that aren't static files
    if (!req.originalUrl.startsWith('/api/') && 
        !req.originalUrl.includes('.') && // No file extensions
        req.originalUrl !== '/' &&
        req.originalUrl !== '/renewal' &&
        req.originalUrl !== '/success') {
        
        Logger.debug('Frontend route not found, serving index.html', { 
            url: req.originalUrl,
            ip: req.ip 
        });
    }
    
    res.status(404).sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware - Must be last
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    Logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    
    // Graceful shutdown
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    Logger.error('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise
    });
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
    Logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    server.close((err) => {
        if (err) {
            Logger.error('Error during graceful shutdown', { error: err.message });
            process.exit(1);
        }
        
        Logger.info('Server closed successfully');
        
        // Close database connections
        if (db.pool) {
            db.pool.end((dbErr) => {
                if (dbErr) {
                    Logger.error('Error closing database connections', { error: dbErr.message });
                    process.exit(1);
                }
                
                Logger.info('Database connections closed successfully');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        Logger.error('Forcing shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    // Initialize database connection
    connectDBWithRetry();
    
    Logger.info('Msingi Gym System server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV,
        mpesaEnvironment: process.env.MPESA_ENVIRONMENT || 'sandbox',
        axtraxEnabled: process.env.AXTRAX_ENABLED === 'true',
        nodeVersion: process.version,
        platform: process.platform
    });
    
    console.log('='.repeat(60));
    console.log('🚀 MSINGI GYM ACCESS CONTROL SYSTEM');
    console.log('='.repeat(60));
    console.log(`📍 Server running on port: ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log(`📱 M-Pesa: ${process.env.MPESA_ENVIRONMENT || 'sandbox'}`);
    console.log(`🔐 AxtraxNG: ${process.env.AXTRAX_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
    console.log(`🗄️ Database: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    console.log('='.repeat(60));
    console.log('📋 Available URLs:');
    console.log(`   • Main Site: http://localhost:${PORT}/`);
    console.log(`   • Renewal: http://localhost:${PORT}/renewal`);
    console.log(`   • Success: http://localhost:${PORT}/success`);
    console.log(`   • API Health: http://localhost:${PORT}/api/health`);
    console.log(`   • API Docs: http://localhost:${PORT}/api/docs`);
    console.log('='.repeat(60));
    console.log('⚡ Server is ready to accept requests!');
    console.log('='.repeat(60));
});

// Export for testing
module.exports = { app, server };