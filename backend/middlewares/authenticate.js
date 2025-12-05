const jwt = require('jsonwebtoken');
const winston = require('winston');

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
        })
    ]
});

function authenticateToken(req, res, next) {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        logger.warn('Authentication token missing');
        return res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication token required'
            }
        });
    }

    // Check for Demo Token
    if (token === 'DEMO_TOKEN') {
        req.user = {
            userId: 'demo-user-id',
            email: 'demo@example.com',
            role: 'admin',
            businessId: 'demo-business-id'
        };
        logger.debug('Demo user authenticated');
        return next();
    }

    try {
        // Verify token using JWT_SECRET (works for both custom and Supabase tokens)
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Support both custom token structure AND Supabase token structure
        // Supabase tokens use 'sub' for user ID and have email in the payload
        req.user = {
            userId: payload.userId || payload.sub,  // 'sub' is Supabase's user ID field
            email: payload.email,
            role: payload.role || payload.user_metadata?.role || 'user',
            businessId: payload.businessId || payload.user_metadata?.business_id || null
        };

        logger.debug(`User authenticated: ${req.user.email}`);
        next();
    } catch (error) {
        logger.warn('Invalid token:', error.message);

        let errorCode = 'INVALID_TOKEN';
        let errorMessage = 'Invalid or expired token';

        if (error.name === 'TokenExpiredError') {
            errorCode = 'TOKEN_EXPIRED';
            errorMessage = 'Token has expired';
        } else if (error.name === 'JsonWebTokenError') {
            errorCode = 'INVALID_TOKEN';
            errorMessage = 'Token signature is invalid. Ensure JWT_SECRET matches Supabase.';
        }

        res.status(403).json({
            error: {
                code: errorCode,
                message: errorMessage
            }
        });
    }
}

function authorizeRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            logger.warn(`Unauthorized access attempt by ${req.user.email} to ${role} resource`);
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions'
                }
            });
        }
        next();
    };
}

module.exports = {
    authenticate: authenticateToken,
    authorizeRole
};