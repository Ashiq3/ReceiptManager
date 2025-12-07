require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

// Initialize Express app
const app = express();

// Configuration
const PORT = process.env.APP_PORT || 3000;
const APP_ENV = process.env.APP_ENV || 'development';

// Setup logging
// Setup logging
const transports = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    })
];

// Only add file transport if NOT running on Vercel
if (!process.env.VERCEL) {
    transports.push(
        new winston.transports.File({
            filename: process.env.LOG_FILE || 'logs/app.log',
            maxsize: process.env.LOG_MAX_SIZE || '100m',
            maxFiles: process.env.LOG_MAX_FILES || 7
        })
    );
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: transports
});

// Ensure logs directory exists (only if not on Vercel)
if (!process.env.VERCEL) {
    const logDir = path.dirname(process.env.LOG_FILE || 'logs/app.log');
    if (!fs.existsSync(logDir)) {
        try {
            fs.mkdirSync(logDir, { recursive: true });
        } catch (err) {
            console.error('Failed to create log directory:', err);
        }
    }
}

// Middleware
app.use(helmet()); // Sets various HTTP headers for security
app.use(compression());
app.use(cors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Global Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        error: {
            code: 'TM_TOO_MANY_REQUESTS',
            message: 'Too many requests from this IP, please try again after 15 minutes'
        }
    }
});
// Apply to all API routes
app.use('/api/', globalLimiter);

// Parse JSON bodies (as sent by API clients)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
const { initializeSupabase } = require('./backend/supabaseClient');
initializeSupabase()
    .then(() => logger.info('Supabase connected successfully'))
    .catch(err => {
        logger.error('Supabase connection failed:', err);
        // Do NOT exit process, allow partial functionality (Demo Mode)
        // process.exit(1); 
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

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'frontend/build')));

// API 404 handler - only for /api routes that didn't match
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: 'API endpoint not found',
            path: req.originalUrl
        }
    });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    const indexFile = path.join(__dirname, 'frontend/build/index.html');
    if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
    } else {
        res.status(404).json({
            error: {
                code: 'NOT_FOUND',
                message: 'Resource not found (Frontend build missing)',
                path: req.originalUrl
            }
        });
    }
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