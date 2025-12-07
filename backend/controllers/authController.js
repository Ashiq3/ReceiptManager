const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');


class AuthController {
    async register(req, res) {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Validation failed',
                        details: errors.array()
                    }
                });
            }

            const { email, password, full_name, business_name, phone_number } = req.body;

            // Check if user exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    error: {
                        code: 'USER_EXISTS',
                        message: 'Email already registered'
                    }
                });
            }

            // Create user
            const user = await User.create({
                email,
                password,
                full_name,
                business_name,
                phone_number
            });

            // Generate tokens
            const authToken = await User.generateAuthToken(user);
            const refreshToken = await User.generateRefreshToken(user);

            // Store refresh token
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

            await User.storeRefreshToken(user.user_id, refreshToken, expiresAt);

            logger.info(`User registered: ${user.email}`);

            res.status(201).json({
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role
                },
                business: {
                    business_id: user.business_id,
                    business_name: user.business_name
                },
                auth_token: authToken,
                refresh_token: refreshToken,
                expires_in: process.env.JWT_EXPIRES_IN || '15m'
            });
        } catch (error) {
            logger.error('Registration error:', error);
            res.status(500).json({
                error: {
                    code: 'REGISTRATION_FAILED',
                    message: 'Registration failed',
                    detail: error.message
                }
            });
        }
    }

    async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Validation failed',
                        details: errors.array()
                    }
                });
            }

            const { email, password } = req.body;

            // Find user
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    error: {
                        code: 'INVALID_CREDENTIALS',
                        message: 'Invalid email or password'
                    }
                });
            }

            // Validate password
            const isValid = await User.validatePassword(email, password);
            if (!isValid) {
                return res.status(401).json({
                    error: {
                        code: 'INVALID_CREDENTIALS',
                        message: 'Invalid email or password'
                    }
                });
            }

            // Get user with business
            const userWithBusiness = await User.getUserWithBusiness(user.user_id);

            // Generate tokens
            const authToken = await User.generateAuthToken(userWithBusiness);
            const refreshToken = await User.generateRefreshToken(userWithBusiness);

            // Store refresh token
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

            await User.storeRefreshToken(userWithBusiness.user_id, refreshToken, expiresAt);

            logger.info(`User logged in: ${user.email}`);

            res.json({
                user: {
                    user_id: userWithBusiness.user_id,
                    email: userWithBusiness.email,
                    full_name: userWithBusiness.full_name,
                    phone_number: userWithBusiness.phone_number,
                    role: userWithBusiness.role
                },
                business: userWithBusiness.business_id ? {
                    business_id: userWithBusiness.business_id,
                    business_name: userWithBusiness.business_name,
                    business_type: userWithBusiness.business_type
                } : null,
                auth_token: authToken,
                refresh_token: refreshToken,
                expires_in: process.env.JWT_EXPIRES_IN || '15m'
            });
        } catch (error) {
            logger.error('Login error:', error);
            res.status(500).json({
                error: {
                    code: 'LOGIN_FAILED',
                    message: 'Login failed',
                    detail: error.message
                }
            });
        }
    }

    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    error: {
                        code: 'INVALID_INPUT',
                        message: 'Refresh token required'
                    }
                });
            }

            // Verify refresh token
            let payload;
            try {
                payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
            } catch (error) {
                return res.status(403).json({
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Invalid refresh token'
                    }
                });
            }

            // Find user with refresh token
            const user = await User.findByRefreshToken(refreshToken);
            if (!user) {
                return res.status(403).json({
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Invalid refresh token'
                    }
                });
            }

            // Generate new access token
            const newAuthToken = await User.generateAuthToken(user);

            logger.info(`Token refreshed for user: ${user.email}`);

            res.json({
                auth_token: newAuthToken,
                expires_in: process.env.JWT_EXPIRES_IN || '15m'
            });
        } catch (error) {
            logger.error('Token refresh error:', error);
            res.status(500).json({
                error: {
                    code: 'TOKEN_REFRESH_FAILED',
                    message: 'Token refresh failed',
                    detail: error.message
                }
            });
        }
    }

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            // Find user
            const user = await User.findByEmail(email);
            if (!user) {
                // Don't reveal if email exists for security
                return res.json({
                    message: 'If email exists, password reset link has been sent'
                });
            }

            // Generate reset token
            const resetToken = jwt.sign(
                { userId: user.user_id, purpose: 'password_reset' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // In production, send email with reset link
            logger.info(`Password reset requested for: ${email}`);
            logger.info(`Reset token: ${resetToken}`); // In real app, this would be in email

            res.json({
                message: 'Password reset link has been sent to your email'
            });
        } catch (error) {
            logger.error('Forgot password error:', error);
            res.status(500).json({
                error: {
                    code: 'PASSWORD_RESET_FAILED',
                    message: 'Password reset failed',
                    detail: error.message
                }
            });
        }
    }

    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;

            // Verify token
            let payload;
            try {
                payload = jwt.verify(token, process.env.JWT_SECRET);
            } catch (error) {
                return res.status(400).json({
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Invalid or expired token'
                    }
                });
            }

            if (payload.purpose !== 'password_reset') {
                return res.status(400).json({
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Invalid token purpose'
                    }
                });
            }

            // Update password
            const user = await User.updatePassword(payload.userId, newPassword);

            logger.info(`Password reset for user: ${user.email}`);

            res.json({
                message: 'Password has been reset successfully'
            });
        } catch (error) {
            logger.error('Reset password error:', error);
            res.status(500).json({
                error: {
                    code: 'PASSWORD_RESET_FAILED',
                    message: 'Password reset failed',
                    detail: error.message
                }
            });
        }
    }

    async logout(req, res) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (token) {
                // Revoke refresh token
                await User.revokeRefreshToken(token);
                logger.info('User logged out');
            }

            res.json({
                message: 'Logged out successfully'
            });
        } catch (error) {
            logger.error('Logout error:', error);
            res.status(500).json({
                error: {
                    code: 'LOGOUT_FAILED',
                    message: 'Logout failed',
                    detail: error.message
                }
            });
        }
    }
}

module.exports = new AuthController();