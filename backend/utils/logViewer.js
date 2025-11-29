const fs = require('fs');
const path = require('path');

class LogViewer {
    static getLogFiles() {
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) {
            return [];
        }
        
        const files = fs.readdirSync(logsDir)
            .filter(file => file.endsWith('.log'))
            .sort()
            .reverse();
            
        return files;
    }

    static readLogFile(filename, lines = 100) {
        const logPath = path.join(__dirname, '../logs', filename);
        
        if (!fs.existsSync(logPath)) {
            throw new Error('Log file not found');
        }
        
        const content = fs.readFileSync(logPath, 'utf8');
        const allLines = content.split('\n').filter(line => line.trim());
        
        // Return last N lines
        return allLines.slice(-lines);
    }

    static searchLogs(query, limit = 50) {
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) {
            return [];
        }
        
        const results = [];
        const files = this.getLogFiles();
        
        for (const file of files) {
            if (results.length >= limit) break;
            
            const logPath = path.join(logsDir, file);
            const content = fs.readFileSync(logPath, 'utf8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                if (line.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                        file,
                        line: line.trim(),
                        timestamp: new Date().toISOString()
                    });
                    
                    if (results.length >= limit) break;
                }
            }
        }
        
        return results;
    }

    static getSystemStats() {
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) {
            return { totalFiles: 0, totalSize: 0 };
        }
        
        const files = this.getLogFiles();
        let totalSize = 0;
        
        files.forEach(file => {
            const filePath = path.join(logsDir, file);
            if (fs.existsSync(filePath)) {
                totalSize += fs.statSync(filePath).size;
            }
        });
        
        return {
            totalFiles: files.length,
            totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
            latestFile: files[0] || 'None'
        };
    }
}

module.exports = LogViewer;