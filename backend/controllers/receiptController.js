const Receipt = require('../models/Receipt');
const { validationResult } = require('express-validator');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

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

class ReceiptController {
    async uploadReceipt(req, res) {
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

            if (!req.file) {
                return res.status(400).json({
                    error: {
                        code: 'NO_FILE',
                        message: 'No file uploaded'
                    }
                });
            }

            // Use business_id from body, fall back to authenticated user's businessId
            const business_id = req.body.business_id || req.user.businessId;
            const user_id = req.user.userId;

            if (!business_id) {
                return res.status(400).json({
                    error: {
                        code: 'MISSING_BUSINESS_ID',
                        message: 'Business ID is required'
                    }
                });
            }

            // Create receipt record
            const receipt = await Receipt.create({
                business_id,
                user_id
            }, req.file);

            logger.info(`Receipt uploaded: ${receipt.receipt_id} for business: ${business_id}`);

            // Start processing (in background)
            this.processReceipt(receipt.receipt_id);

            res.status(201).json({
                receipt_id: receipt.receipt_id,
                status: receipt.status,
                message: 'Receipt uploaded successfully, processing started'
            });
        } catch (error) {
            logger.error('Upload receipt error:', error);
            res.status(500).json({
                error: {
                    code: 'UPLOAD_FAILED',
                    message: 'Receipt upload failed',
                    detail: error.message
                }
            });
        }
    }

    async processReceipt(receiptId) {
        try {
            // Update status to processing
            await Receipt.updateStatus(receiptId, 'processing');

            // In a real implementation, this would call the AI service
            // For now, we'll simulate processing
            logger.info(`Processing receipt: ${receiptId}`);

            // Simulate AI processing delay
            setTimeout(async () => {
                try {
                    // Simulated extracted data
                    const extractedData = {
                        vendor: 'Sample Vendor',
                        date: new Date().toISOString().split('T')[0],
                        total: 125.50,
                        payment_method: 'Credit Card',
                        currency: 'USD',
                        raw_text: 'Sample receipt text extracted by AI',
                        confidence: 0.95,
                        items: [
                            {
                                description: 'Sample Item 1',
                                quantity: 2,
                                unit_price: 15.99,
                                total_price: 31.98,
                                category: 'Food'
                            },
                            {
                                description: 'Sample Item 2',
                                quantity: 1,
                                unit_price: 20.50,
                                total_price: 20.50,
                                category: 'Supplies'
                            }
                        ]
                    };

                    // Update receipt with extracted data
                    await Receipt.updateStatus(receiptId, 'processed', extractedData);

                    // Add items
                    await Receipt.addItems(receiptId, extractedData.items);

                    logger.info(`Receipt processed: ${receiptId}`);
                } catch (error) {
                    logger.error(`Processing failed for receipt ${receiptId}:`, error);
                    await Receipt.updateStatus(receiptId, 'failed');
                }
            }, 2000); // Simulate 2 second processing time
        } catch (error) {
            logger.error(`Failed to start processing for receipt ${receiptId}:`, error);
            await Receipt.updateStatus(receiptId, 'failed');
        }
    }

    async getReceiptStatus(req, res) {
        try {
            const { receipt_id } = req.params;

            const receipt = await Receipt.findById(receipt_id);

            if (!receipt) {
                return res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Receipt not found'
                    }
                });
            }

            // Check if user has access
            if (receipt.business_id.toString() !== req.user.businessId) {
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Access denied'
                    }
                });
            }

            // Get items if processed
            let items = [];
            if (receipt.status === 'processed') {
                items = await Receipt.getItems(receipt_id);
            }

            res.json({
                receipt_id: receipt.receipt_id,
                business_id: receipt.business_id,
                status: receipt.status,
                vendor_name: receipt.vendor_name,
                receipt_date: receipt.receipt_date,
                total_amount: receipt.total_amount,
                payment_method: receipt.payment_method,
                currency: receipt.currency,
                processed_at: receipt.processed_at,
                items: items.map(item => ({
                    description: item.item_description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    category: item.category
                }))
            });
        } catch (error) {
            logger.error('Get receipt status error:', error);
            res.status(500).json({
                error: {
                    code: 'STATUS_CHECK_FAILED',
                    message: 'Failed to get receipt status',
                    detail: error.message
                }
            });
        }
    }

    async listReceipts(req, res) {
        try {
            const { business_id } = req.user;
            const {
                limit = 50,
                offset = 0,
                start_date,
                end_date,
                vendor,
                min_amount,
                max_amount
            } = req.query;

            const filterOptions = {
                limit: parseInt(limit),
                offset: parseInt(offset),
                startDate: start_date,
                endDate: end_date,
                vendor: vendor,
                minAmount: min_amount,
                maxAmount: max_amount
            };

            const receipts = await Receipt.findByBusiness(business_id, filterOptions);
            const total = await Receipt.countByBusiness(business_id, filterOptions);

            res.json({
                total_count: total,
                receipts: receipts.map(receipt => ({
                    receipt_id: receipt.receipt_id,
                    vendor_name: receipt.vendor_name,
                    receipt_date: receipt.receipt_date,
                    total_amount: receipt.total_amount,
                    status: receipt.status,
                    processed_at: receipt.processed_at
                }))
            });
        } catch (error) {
            logger.error('List receipts error:', error);
            res.status(500).json({
                error: {
                    code: 'LIST_FAILED',
                    message: 'Failed to list receipts',
                    detail: error.message
                }
            });
        }
    }

    async getReceiptDetails(req, res) {
        try {
            const { receipt_id } = req.params;
            const { business_id } = req.user;

            const receipt = await Receipt.findById(receipt_id);

            if (!receipt) {
                return res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Receipt not found'
                    }
                });
            }

            if (receipt.business_id.toString() !== business_id) {
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Access denied'
                    }
                });
            }

            const items = await Receipt.getItems(receipt_id);

            res.json({
                receipt_id: receipt.receipt_id,
                business_id: receipt.business_id,
                original_filename: receipt.original_filename,
                vendor_name: receipt.vendor_name,
                receipt_date: receipt.receipt_date,
                total_amount: receipt.total_amount,
                payment_method: receipt.payment_method,
                currency: receipt.currency,
                status: receipt.status,
                processed_at: receipt.processed_at,
                items: items.map(item => ({
                    item_id: item.item_id,
                    description: item.item_description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    category: item.category
                }))
            });
        } catch (error) {
            logger.error('Get receipt details error:', error);
            res.status(500).json({
                error: {
                    code: 'DETAILS_FAILED',
                    message: 'Failed to get receipt details',
                    detail: error.message
                }
            });
        }
    }

    async deleteReceipt(req, res) {
        try {
            const { receipt_id } = req.params;
            const { business_id } = req.user;

            const receipt = await Receipt.findById(receipt_id);

            if (!receipt) {
                return res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Receipt not found'
                    }
                });
            }

            if (receipt.business_id.toString() !== business_id) {
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Access denied'
                    }
                });
            }

            await Receipt.delete(receipt_id);

            logger.info(`Receipt deleted: ${receipt_id}`);

            res.json({
                message: 'Receipt deleted successfully'
            });
        } catch (error) {
            logger.error('Delete receipt error:', error);
            res.status(500).json({
                error: {
                    code: 'DELETE_FAILED',
                    message: 'Failed to delete receipt',
                    detail: error.message
                }
            });
        }
    }

    async getReceiptFile(req, res) {
        try {
            const { receipt_id } = req.params;
            const { business_id } = req.user;

            const receipt = await Receipt.findById(receipt_id);

            if (!receipt) {
                return res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Receipt not found'
                    }
                });
            }

            if (receipt.business_id.toString() !== business_id) {
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Access denied'
                    }
                });
            }

            const filePath = await Receipt.getFilePath(receipt_id);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    error: {
                        code: 'FILE_NOT_FOUND',
                        message: 'Receipt file not found'
                    }
                });
            }

            res.sendFile(filePath);
        } catch (error) {
            logger.error('Get receipt file error:', error);
            res.status(500).json({
                error: {
                    code: 'FILE_FAILED',
                    message: 'Failed to get receipt file',
                    detail: error.message
                }
            });
        }
    }

    async getAnalytics(req, res) {
        try {
            const { business_id } = req.user;
            const { start_date, end_date } = req.query;

            const analytics = await Receipt.getAnalytics(business_id, {
                startDate: start_date,
                endDate: end_date
            });

            const categories = await Receipt.getCategoryBreakdown(business_id, {
                startDate: start_date,
                endDate: end_date
            });

            res.json({
                total_receipts: analytics.total_receipts,
                total_spending: analytics.total_spending,
                average_per_receipt: analytics.avg_per_receipt,
                first_receipt_date: analytics.first_receipt_date,
                last_receipt_date: analytics.last_receipt_date,
                top_categories: categories.map(cat => ({
                    category: cat.category,
                    amount: cat.total_amount,
                    percentage: parseFloat(((cat.total_amount / analytics.total_spending) * 100).toFixed(2)) || 0
                }))
            });
        } catch (error) {
            logger.error('Get analytics error:', error);
            res.status(500).json({
                error: {
                    code: 'ANALYTICS_FAILED',
                    message: 'Failed to get analytics',
                    detail: error.message
                }
            });
        }
    }
}

module.exports = new ReceiptController();