// Simple console-based logger
class SimpleLogger {
    static debug(message, data = null) {
        if (process.env.DEBUG_MODE === 'true') {
            console.log(`[DEBUG] ${message}`, data || '');
        }
    }
    
    static info(message, data = null) {
        console.log(`[INFO] ${message}`, data || '');
    }
    
    static error(message, data = null) {
        console.error(`[ERROR] ${message}`, data || '');
    }
    
    static warn(message, data = null) {
        console.warn(`[WARN] ${message}`, data || '');
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error('Unhandled Error:', err.message);
    
    if (process.env.DEBUG_MODE === 'true') {
        console.error('Stack:', err.stack);
    }

    let error = { ...err };
    error.message = err.message;

    // MySQL duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
        error = { message: 'Duplicate entry found', status: 400 };
    }

    // MySQL connection error
    if (err.code === 'ECONNREFUSED') {
        error = { message: 'Database connection refused', status: 503 };
    }

    // M-Pesa API errors
    if (err.message.includes('M-Pesa') || err.message.includes('MPesa')) {
        console.error('M-Pesa Error:', err.message);
    }

    res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};

module.exports = { errorHandler, Logger: SimpleLogger };