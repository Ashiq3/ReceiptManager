const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { check } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests, please try again later'
        }
    }
});

// Registration
router.post(
    '/register',
    authLimiter,
    [
        check('email').isEmail().normalizeEmail(),
        check('password').isLength({ min: 8 }),
        check('full_name').not().isEmpty(),
        check('business_name').not().isEmpty()
    ],
    authController.register
);

// Login
router.post(
    '/login',
    authLimiter,
    [
        check('email').isEmail().normalizeEmail(),
        check('password').not().isEmpty()
    ],
    authController.login
);

// Token refresh
router.post('/refresh', authController.refreshToken);

// Forgot password
router.post(
    '/forgot-password',
    authLimiter,
    [
        check('email').isEmail().normalizeEmail()
    ],
    authController.forgotPassword
);

// Reset password
router.post(
    '/reset-password',
    authLimiter,
    [
        check('token').not().isEmpty(),
        check('newPassword').isLength({ min: 8 })
    ],
    authController.resetPassword
);

// Logout
router.post('/logout', authController.logout);

module.exports = router;