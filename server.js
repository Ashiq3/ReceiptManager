require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();

// Configuration
const PORT = process.env.APP_PORT || 3000;
const APP_ENV = process.env.APP_ENV || 'development';

// Setup logging
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({
            filename: process.env.LOG_FILE || 'logs/app.log',
            maxsize: process.env.LOG_MAX_SIZE || '100m',
            maxFiles: process.env.LOG_MAX_FILES || 7
        })
    ]
});

// Ensure logs directory exists
const logDir = path.dirname(process.env.LOG_FILE || 'logs/app.log');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Database connection
const { initializeSupabase } = require('./backend/supabaseClient');
initializeSupabase()
    .then(() => logger.info('Supabase connected successfully'))
    .catch(err => {
        logger.error('Supabase connection failed:', err);
        process.exit(1);
    });

// Routes
const authRoutes = require('./backend/routes/auth');
const receiptRoutes = require('./backend/routes/receipts');
const analyticsRoutes = require('./backend/routes/analytics');
const healthRoutes = require('./backend/routes/health');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/health', healthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);

    const statusCode = err.statusCode || 500;
    const message = APP_ENV === 'development' ? err.message : 'Internal Server Error';

    res.status(statusCode).json({
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: message,
            timestamp: new Date().toISOString()
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            path: req.originalUrl
        }
    });
});

// Export for Vercel serverless functions
module.exports = app;

// For local development
if (require.main === module) {
    const server = app.listen(PORT, () => {
        logger.info(`Server running in ${APP_ENV} mode on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received. Shutting down gracefully...');
        server.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        logger.info('SIGINT received. Shutting down gracefully...');
        server.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
    });
}