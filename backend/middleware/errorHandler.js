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
        
        // Also log to console
        console.log(`[${level.toUpperCase()}] ${message}`, data || '');
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
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    Logger.error('Unhandled Error Occurred', {
        error: {
            message: err.message,
            stack: err.stack
        },
        request: {
            method: req.method,
            url: req.url
        }
    });

    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
};

module.exports = { errorHandler, Logger };