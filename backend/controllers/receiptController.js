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

            // DEMO MODE: Process synchronously to ensure result is available immediately (crucial for Serverless/Vercel)
            let extractedData = null;
            let processingError = null;
            if (receipt.receipt_id.startsWith('demo-')) {
                try {
                    logger.info('Demo mode: processing synchronously');
                    extractedData = await this.processReceipt(receipt.receipt_id);
                    logger.info('Demo mode: synchronous processing complete');
                } catch (err) {
                    logger.error('Demo mode: synchronous processing failed', err);
                    processingError = err.message;
                }
            } else {
                // Production/DB mode: Process in background
                this.processReceipt(receipt.receipt_id);
            }

            res.status(201).json({
                receipt_id: receipt.receipt_id,
                status: extractedData ? 'processed' : receipt.status,
                extracted_data: extractedData,
                processing_error: processingError,
                message: 'Receipt uploaded successfully'
            });
        } catch (error) {
            logger.error('Upload receipt error:', error);
            // Ensure headers haven't been sent
            if (!res.headersSent) {
                return res.status(500).json({
                    error: {
                        code: 'UPLOAD_FAILED',
                        message: 'Receipt upload failed',
                        detail: error.message || 'Unknown server error'
                    }
                });
            }
        }
    }

    async processReceipt(receiptId) {
        try {
            // Check for demo receipt - now we ACTUALLY process them with AI!
            const isDemo = receiptId && receiptId.toString().startsWith('demo-');

            logger.info(`Processing receipt: ${receiptId} (demo mode: ${isDemo})`);

            // Update status to processing
            await Receipt.updateStatus(receiptId, 'processing');

            // Get the file path - for demo, it's stored in demoReceiptsStore
            let filePath;
            let mimeType = 'image/jpeg';

            if (isDemo && Receipt.demoReceiptsStore && Receipt.demoReceiptsStore[receiptId]) {
                // Get from in-memory store
                filePath = Receipt.demoReceiptsStore[receiptId].storage_path;
                mimeType = Receipt.demoReceiptsStore[receiptId].mimetype || 'image/jpeg';
                logger.info(`Demo receipt file path: ${filePath}`);
            } else {
                // Get from database
                filePath = await Receipt.getFilePath(receiptId);
                // Determine mimetype from extension
                const ext = path.extname(filePath).toLowerCase();
                if (ext === '.png') mimeType = 'image/png';
                if (ext === '.pdf') mimeType = 'application/pdf';
                if (ext === '.webp') mimeType = 'image/webp';
                if (ext === '.heic') mimeType = 'image/heic';
            }

            // Call AI Service
            const { processReceipt: processWithAI } = require('../ai/gemini');

            let extractedData;
            try {
                if (!process.env.GEMINI_API_KEY) {
                    throw new Error("GEMINI_API_KEY is not set");
                }

                logger.info(`Calling Gemini AI for file: ${filePath}, mimeType: ${mimeType}`);
                const aiResult = await processWithAI(filePath, mimeType);
                logger.info(`AI Result received for ${receiptId}:`, JSON.stringify(aiResult).slice(0, 200));

                extractedData = {
                    vendor: aiResult.vendor || 'Unknown Vendor',
                    date: aiResult.date || new Date().toISOString().split('T')[0],
                    total: typeof aiResult.total === 'number' ? aiResult.total : parseFloat(aiResult.total) || 0,
                    payment_method: aiResult.payment_method || 'Unknown',
                    currency: aiResult.currency || 'USD',
                    raw_text: JSON.stringify(aiResult),
                    extracted_data: aiResult, // Store the full dynamic JSON
                    confidence: aiResult.confidence || 0.8,
                    items: Array.isArray(aiResult.items) ? aiResult.items.map(item => ({
                        description: item.description || 'Item',
                        quantity: item.quantity || 1,
                        unit_price: item.unit_price || 0,
                        total_price: item.total_price || 0,
                        category: item.category || 'General'
                    })) : []
                };

                // Update receipt with extracted data
                await Receipt.updateStatus(receiptId, 'processed', extractedData);

                // Add items (skipped for demo as we don't have DB)
                if (!isDemo) {
                    await Receipt.addItems(receiptId, extractedData.items);
                }

                logger.info(`Receipt processed successfully: ${receiptId}`);

                return extractedData;

            } catch (aiError) {
                logger.error(`AI Analysis failed for ${receiptId}:`, aiError);
                await Receipt.updateStatus(receiptId, 'failed');
            }
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
            // Allow access if it's a demo receipt or if business_id matches
            if (!receipt.receipt_id.startsWith('demo-') && receipt.business_id.toString() !== req.user.businessId) {
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
            const { businessId } = req.user;
            logger.info(`listReceipts called with businessId: ${businessId}`);
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

            const receipts = await Receipt.findByBusiness(businessId, filterOptions);
            const total = await Receipt.countByBusiness(businessId, filterOptions);

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
            const { businessId } = req.user;

            const receipt = await Receipt.findById(receipt_id);

            if (!receipt) {
                return res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Receipt not found'
                    }
                });
            }

            if (!receipt.receipt_id.startsWith('demo-') && receipt.business_id.toString() !== businessId) {
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
                extracted_data: receipt.extracted_data || {}, // Dynamic AI extracted data
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
            const { businessId } = req.user;

            const receipt = await Receipt.findById(receipt_id);

            if (!receipt) {
                return res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Receipt not found'
                    }
                });
            }

            if (!receipt.receipt_id.startsWith('demo-') && receipt.business_id.toString() !== businessId) {
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
            const { businessId } = req.user;

            const receipt = await Receipt.findById(receipt_id);

            if (!receipt) {
                return res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Receipt not found'
                    }
                });
            }

            if (!receipt.receipt_id.startsWith('demo-') && receipt.business_id.toString() !== businessId) {
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
            const { businessId } = req.user;
            const { start_date, end_date } = req.query;

            const analytics = await Receipt.getAnalytics(businessId, {
                startDate: start_date,
                endDate: end_date
            });

            const categories = await Receipt.getCategoryBreakdown(businessId, {
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