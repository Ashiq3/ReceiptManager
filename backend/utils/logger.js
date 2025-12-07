/**
 * Shared Logger Utility
 * Consolidated Winston logger instance for the entire backend.
 * Replaces duplicate logger instances across controllers, services, and middleware.
 */
const winston = require('winston');

// Create transports array
const transports = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    })
];

// Only add file transport if NOT running on Vercel (serverless has no persistent filesystem)
if (!process.env.VERCEL) {
    const path = require('path');
    const fs = require('fs');

    const logDir = path.dirname(process.env.LOG_FILE || 'logs/app.log');
    if (!fs.existsSync(logDir)) {
        try {
            fs.mkdirSync(logDir, { recursive: true });
        } catch (err) {
            // Ignore - console logging will still work
        }
    }

    transports.push(
        new winston.transports.File({
            filename: process.env.LOG_FILE || 'logs/app.log',
            maxsize: parseInt(process.env.LOG_MAX_SIZE) || 100 * 1024 * 1024, // 100MB
            maxFiles: parseInt(process.env.LOG_MAX_FILES) || 7
        })
    );
}

// Single shared logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: transports
});

module.exports = logger;
