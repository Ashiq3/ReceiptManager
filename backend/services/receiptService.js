const Receipt = require('../models/Receipt');
const AIService = require('./aiService');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

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

class ReceiptService {
    constructor() {
        this.aiService = AIService;
    }

    async uploadReceipt(file, businessId, userId) {
        try {
            // Validate file
            if (!file) {
                throw new Error('No file provided');
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(file.mimetype)) {
                throw new Error('Invalid file type. Only JPEG, PNG, and PDF are supported.');
            }

            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                throw new Error('File too large. Maximum size is 5MB.');
            }

            // Create receipt record
            const receipt = await Receipt.create({
                business_id: businessId,
                user_id: userId
            }, file);

            logger.info(`Receipt created: ${receipt.receipt_id}`);

            // Start processing in background
            this.processReceipt(receipt.receipt_id);

            return receipt;
        } catch (error) {
            logger.error('Upload receipt error:', error);
            throw error;
        }
    }

    async processReceipt(receiptId) {
        try {
            // Update status to processing
            await Receipt.updateStatus(receiptId, 'processing');

            // Process with AI
            await this.aiService.processReceipt(receiptId);

            logger.info(`Receipt processing completed: ${receiptId}`);
        } catch (error) {
            logger.error(`Receipt processing failed: ${receiptId}`, error);
            await Receipt.updateStatus(receiptId, 'failed');
            throw error;
        }
    }

    async getReceiptStatus(receiptId) {
        try {
            const receipt = await Receipt.findById(receiptId);
            if (!receipt) {
                throw new Error('Receipt not found');
            }

            // Get items if processed
            let items = [];
            if (receipt.status === 'processed') {
                items = await Receipt.getItems(receiptId);
            }

            return {
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
            };
        } catch (error) {
            logger.error('Get receipt status error:', error);
            throw error;
        }
    }

    async listReceipts(businessId, { limit = 50, offset = 0, startDate, endDate } = {}) {
        try {
            const receipts = await Receipt.findByBusiness(businessId, {
                limit: parseInt(limit),
                offset: parseInt(offset),
                startDate,
                endDate
            });

            const total = await Receipt.countByBusiness(businessId, {
                startDate,
                endDate
            });

            return {
                total_count: total,
                receipts: receipts.map(receipt => ({
                    receipt_id: receipt.receipt_id,
                    vendor_name: receipt.vendor_name,
                    receipt_date: receipt.receipt_date,
                    total_amount: receipt.total_amount,
                    status: receipt.status,
                    processed_at: receipt.processed_at
                }))
            };
        } catch (error) {
            logger.error('List receipts error:', error);
            throw error;
        }
    }

    async getReceiptDetails(receiptId) {
        try {
            const receipt = await Receipt.findById(receiptId);
            if (!receipt) {
                throw new Error('Receipt not found');
            }

            const items = await Receipt.getItems(receiptId);

            return {
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
            };
        } catch (error) {
            logger.error('Get receipt details error:', error);
            throw error;
        }
    }

    async deleteReceipt(receiptId) {
        try {
            const receipt = await Receipt.findById(receiptId);
            if (!receipt) {
                throw new Error('Receipt not found');
            }

            await Receipt.delete(receiptId);

            logger.info(`Receipt deleted: ${receiptId}`);
            return { success: true };
        } catch (error) {
            logger.error('Delete receipt error:', error);
            throw error;
        }
    }

    async getReceiptFile(receiptId) {
        try {
            const filePath = await Receipt.getFilePath(receiptId);

            if (!fs.existsSync(filePath)) {
                throw new Error('File not found');
            }

            return filePath;
        } catch (error) {
            logger.error('Get receipt file error:', error);
            throw error;
        }
    }

    async getAnalytics(businessId, { startDate, endDate } = {}) {
        try {
            const analytics = await Receipt.getAnalytics(businessId, {
                startDate,
                endDate
            });

            const categories = await Receipt.getCategoryBreakdown(businessId, {
                startDate,
                endDate
            });

            return {
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
            };
        } catch (error) {
            logger.error('Get analytics error:', error);
            throw error;
        }
    }

    async getFileStream(receiptId) {
        try {
            const filePath = await this.getReceiptFile(receiptId);
            return fs.createReadStream(filePath);
        } catch (error) {
            logger.error('Get file stream error:', error);
            throw error;
        }
    }
}

module.exports = new ReceiptService();