const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for cPanel
app.set('trust proxy', 1);

// Enhanced security for production
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

// CORS configuration for production
app.use(cors({
  origin: [
    'https://msingi.co.ke',
    'https://www.msingi.co.ke'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Static files - serve from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
const db = require('./config/database');

// Test database connection with retry
const connectDBWithRetry = async (retries = 5, delay = 5000) => {
  try {
    await db.testConnection();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error(`❌ Database connection failed (${retries} retries left):`, error.message);
    if (retries > 0) {
      setTimeout(() => connectDBWithRetry(retries - 1, delay), delay);
    } else {
      console.error('❌ Could not connect to database after multiple attempts');
      process.exit(1);
    }
  }
};

connectDBWithRetry();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/access', require('./routes/access'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Msingi Gym System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Frontend routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/renewal', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/renewal.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/success.html'));
});

// 404 handler
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    res.status(404).json({
      status: 'error',
      message: 'API endpoint not found'
    });
  } else {
    res.status(404).sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// Error handling
app.use(require('./middleware/errorHandler'));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Msingi Gym System running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`📍 Frontend: https://msingi.co.ke`);
  console.log(`🔧 API: https://msingi.co.ke/api`);
});

module.exports = app;