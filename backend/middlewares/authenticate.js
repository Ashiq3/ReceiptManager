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
        // Verify token
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user to request
        req.user = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
            businessId: payload.businessId
        };

        logger.debug(`User authenticated: ${payload.email}`);
        next();
    } catch (error) {
        logger.warn('Invalid token:', error.message);

        let errorCode = 'INVALID_TOKEN';
        let errorMessage = 'Invalid or expired token';

        if (error.name === 'TokenExpiredError') {
            errorCode = 'TOKEN_EXPIRED';
            errorMessage = 'Token has expired';
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