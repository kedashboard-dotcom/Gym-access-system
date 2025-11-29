const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
    static getLogFileName() {
        const date = new Date().toISOString().split('T')[0];
        return `app-${date}.log`;
    }

    static writeLog(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logFile = path.join(logsDir, this.getLogFileName());
        
        let logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (data) {
            if (data instanceof Error) {
                logEntry += `\n    Error: ${data.message}`;
                logEntry += `\n    Stack: ${data.stack}`;
            } else if (typeof data === 'object') {
                logEntry += `\n    Data: ${JSON.stringify(data, null, 2)}`;
            } else {
                logEntry += `\n    Data: ${data}`;
            }
        }
        
        logEntry += '\n' + '='.repeat(80) + '\n';
        
        // Write to file
        fs.appendFileSync(logFile, logEntry, 'utf8');
        
        // Also log to console in development
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true') {
            console.log(`[${level.toUpperCase()}] ${message}`, data || '');
        }
    }

    static info(message, data = null) {
        this.writeLog('info', message, data);
    }

    static error(message, data = null) {
        this.writeLog('error', message, data);
    }

    static warn(message, data = null) {
        this.writeLog('warn', message, data);
    }

    static debug(message, data = null) {
        if (process.env.DEBUG_MODE === 'true') {
            this.writeLog('debug', message, data);
        }
    }

    static apiRequest(req, res, next) {
        const start = Date.now();
        
        // Log request
        this.debug('API Request Received', {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Hook into response finish to log response
        res.on('finish', () => {
            const duration = Date.now() - start;
            const logData = {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip
            };

            if (res.statusCode >= 400) {
                this.error('API Request Failed', logData);
            } else {
                this.info('API Request Completed', logData);
            }
        });

        next();
    }
}

// Enhanced error handler middleware
const errorHandler = (err, req, res, next) => {
    // Log the error with full details
    Logger.error('Unhandled Error Occurred', {
        error: {
            message: err.message,
            stack: err.stack,
            code: err.code,
            name: err.name
        },
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }
    });

    // Default error
    let error = { ...err };
    error.message = err.message;

    // MySQL duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
        const message = 'Duplicate entry found';
        error = { message, status: 400 };
        Logger.warn('Database duplicate entry', { error: err.message });
    }

    // MySQL connection error
    if (err.code === 'ECONNREFUSED') {
        const message = 'Database connection refused';
        error = { message, status: 503 };
        Logger.error('Database connection failed', { error: err.message });
    }

    // M-Pesa API errors
    if (err.message.includes('M-Pesa') || err.message.includes('MPesa')) {
        Logger.error('M-Pesa API Error', { error: err.message });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        Logger.warn('Validation Error', { error: err.message });
    }

    res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};

module.exports = { errorHandler, Logger };