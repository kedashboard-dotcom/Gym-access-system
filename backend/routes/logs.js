const express = require('express');
const router = express.Router();
const LogViewer = require('../utils/logViewer');
const { Logger } = require('../middleware/errorHandler');

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
        Logger.warn('Unauthorized log access attempt', { ip: req.ip });
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Invalid API key'
        });
    }
    
    next();
};

// Get list of log files
router.get('/files', authenticateAdmin, (req, res) => {
    try {
        const files = LogViewer.getLogFiles();
        const stats = LogViewer.getSystemStats();
        
        Logger.info('Log files accessed by admin', { ip: req.ip });
        
        res.json({
            status: 'success',
            data: {
                files,
                stats
            }
        });
    } catch (error) {
        Logger.error('Failed to get log files', { error: error.message });
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve log files'
        });
    }
});

// Read specific log file
router.get('/file/:filename', authenticateAdmin, (req, res) => {
    try {
        const { filename } = req.params;
        const lines = parseInt(req.query.lines) || 100;
        
        const logLines = LogViewer.readLogFile(filename, lines);
        
        Logger.info('Log file read by admin', { filename, lines, ip: req.ip });
        
        res.json({
            status: 'success',
            data: {
                filename,
                lines: logLines
            }
        });
    } catch (error) {
        Logger.error('Failed to read log file', { filename: req.params.filename, error: error.message });
        res.status(500).json({
            status: 'error',
            message: 'Failed to read log file'
        });
    }
});

// Search logs
router.get('/search', authenticateAdmin, (req, res) => {
    try {
        const { q, limit } = req.query;
        
        if (!q) {
            return res.status(400).json({
                status: 'error',
                message: 'Search query is required'
            });
        }
        
        const results = LogViewer.searchLogs(q, parseInt(limit) || 50);
        
        Logger.info('Log search performed by admin', { query: q, results: results.length, ip: req.ip });
        
        res.json({
            status: 'success',
            data: {
                query: q,
                results,
                count: results.length
            }
        });
    } catch (error) {
        Logger.error('Log search failed', { query: req.query.q, error: error.message });
        res.status(500).json({
            status: 'error',
            message: 'Search failed'
        });
    }
});

module.exports = router;