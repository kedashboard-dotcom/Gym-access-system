const mysql = require('mysql2/promise');
const { Logger } = require('../middleware/errorHandler');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gym_access_system',
    charset: process.env.DB_CHARSET || 'utf8mb4',
    timezone: process.env.DB_TIMEZONE || '+00:00',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
    timeout: parseInt(process.env.DB_TIMEOUT) || 60000
};

const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        Logger.info('Database connection established successfully');
        
        // Test basic query
        const [results] = await connection.execute('SELECT 1 as test');
        if (results[0].test === 1) {
            Logger.debug('Database query test successful');
        }
        
        connection.release();
        return true;
    } catch (error) {
        Logger.error('Database connection failed', {
            error: error.message,
            config: {
                host: dbConfig.host,
                database: dbConfig.database,
                user: dbConfig.user
            }
        });
        throw error;
    }
};

// Query helper function with logging
const query = async (sql, params = []) => {
    const startTime = Date.now();
    try {
        Logger.debug('Executing database query', { sql, params });
        const [results] = await pool.execute(sql, params);
        const duration = Date.now() - startTime;
        Logger.debug('Database query completed', {
            sql,
            params,
            duration: `${duration}ms`,
            rows: results.length || results.affectedRows
        });
        return results;
    } catch (error) {
        const duration = Date.now() - startTime;
        Logger.error('Database query failed', {
            sql,
            params,
            duration: `${duration}ms`,
            error: error.message,
            code: error.code
        });
        throw error;
    }
};

// Execute helper function with logging
const execute = async (sql, params = []) => {
    const startTime = Date.now();
    try {
        Logger.debug('Executing database command', { sql, params });
        const [results] = await pool.execute(sql, params);
        const duration = Date.now() - startTime;
        Logger.debug('Database command completed', {
            sql,
            params,
            duration: `${duration}ms`,
            affectedRows: results.affectedRows,
            insertId: results.insertId
        });
        return results;
    } catch (error) {
        const duration = Date.now() - startTime;
        Logger.error('Database command failed', {
            sql,
            params,
            duration: `${duration}ms`,
            error: error.message,
            code: error.code
        });
        throw error;
    }
};

module.exports = {
    pool,
    testConnection,
    query,
    execute
};