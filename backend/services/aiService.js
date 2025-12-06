const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const { getDatabase } = require('../database');

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

class AIService {
    constructor() {
        this.db = getDatabase();
        this.modelPath = process.env.AI_MODEL_PATH || './models/receipt-processor';
    }

    async processReceipt(receiptId) {
        try {
            // Get receipt from database
            const receipt = await this.getReceipt(receiptId);
            if (!receipt) {
                throw new Error('Receipt not found');
            }

            // Update status to processing
            await this.updateReceiptStatus(receiptId, 'processing');

            // Get file path
            const filePath = await this.getReceiptFilePath(receiptId);

            // Process with AI model
            const extractedData = await this.extractDataFromImage(filePath);

            // Update receipt with extracted data
            await this.updateReceiptWithData(receiptId, extractedData);

            // Add items
            if (extractedData.items && extractedData.items.length > 0) {
                await this.addReceiptItems(receiptId, extractedData.items);
            }

            logger.info(`AI processing completed for receipt ${receiptId}`);
            return extractedData;
        } catch (error) {
            logger.error(`AI processing failed for receipt ${receiptId}:`, error);
            await this.updateReceiptStatus(receiptId, 'failed');
            throw error;
        }
    }

    async getReceipt(receiptId) {
        const query = 'SELECT * FROM receipts WHERE receipt_id = $1';
        const result = await this.db.query(query, [receiptId]);
        return result.rows[0] || null;
    }

    async updateReceiptStatus(receiptId, status) {
        const query = `
      UPDATE receipts
      SET status = $1
      WHERE receipt_id = $2
      RETURNING *;
    `;
        const result = await this.db.query(query, [status, receiptId]);
        return result.rows[0];
    }

    async getReceiptFilePath(receiptId) {
        const query = 'SELECT storage_path FROM receipts WHERE receipt_id = $1';
        const result = await this.db.query(query, [receiptId]);

        if (result.rows.length === 0) {
            throw new Error('Receipt not found');
        }

        return path.join(process.env.STORAGE_LOCAL_PATH || './uploads', result.rows[0].storage_path);
    }

    async extractDataFromImage(filePath) {
        try {
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error('File not found');
            }

            logger.info(`Processing image with Gemini: ${filePath}`);

            // Initialize Gemini
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            // Read image as base64
            const imageData = fs.readFileSync(filePath);
            const base64Image = imageData.toString('base64');
            const mimeType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

            // Create the prompt for receipt extraction
            const prompt = `Analyze this receipt image and extract the following information in JSON format:
{
    "vendor": "store/vendor name",
    "date": "YYYY-MM-DD format",
    "total": numeric total amount,
    "payment_method": "cash/credit/debit/other",
    "currency": "USD/EUR/etc",
    "raw_text": "all visible text on receipt",
    "items": [
        {
            "description": "item name",
            "quantity": numeric quantity,
            "unit_price": numeric price per unit,
            "total_price": numeric total for this item,
            "category": "Food/Supplies/Electronics/etc"
        }
    ]
}

Return ONLY valid JSON, no markdown or extra text.`;

            // Call Gemini API
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Image
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();

            // Parse JSON response
            let extractedData;
            try {
                // Clean up the response (remove markdown code blocks if present)
                let cleanText = text.trim();
                if (cleanText.startsWith('```json')) {
                    cleanText = cleanText.slice(7);
                }
                if (cleanText.startsWith('```')) {
                    cleanText = cleanText.slice(3);
                }
                if (cleanText.endsWith('```')) {
                    cleanText = cleanText.slice(0, -3);
                }
                extractedData = JSON.parse(cleanText.trim());
            } catch (parseError) {
                logger.error('Failed to parse Gemini response:', text);
                throw new Error('Failed to parse AI response');
            }

            // Add confidence score
            extractedData.confidence = 0.95;

            logger.info(`Gemini extraction successful for: ${filePath}`);
            return extractedData;
        } catch (error) {
            logger.error('Gemini extraction failed:', error);
            throw error;
        }
    }

    async updateReceiptWithData(receiptId, extractedData) {
        const query = `
      UPDATE receipts
      SET
        vendor_name = $1,
        receipt_date = $2,
        total_amount = $3,
        payment_method = $4,
        currency = $5,
        raw_text = $6,
        confidence_score = $7,
        status = $8,
        processed_at = CURRENT_TIMESTAMP
      WHERE receipt_id = $9
      RETURNING *;
    `;

        const values = [
            extractedData.vendor,
            extractedData.date,
            extractedData.total,
            extractedData.payment_method,
            extractedData.currency || 'USD',
            extractedData.raw_text,
            extractedData.confidence || 0.95,
            'processed',
            receiptId
        ];

        const result = await this.db.query(query, values);
        return result.rows[0];
    }

    async addReceiptItems(receiptId, items) {
        if (!items || items.length === 0) {
            return [];
        }

        const query = `
      INSERT INTO receipt_items
      (receipt_id, item_description, quantity, unit_price, total_price, category)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

        const results = [];
        for (const item of items) {
            const values = [
                receiptId,
                item.description,
                item.quantity || 1,
                item.unit_price || item.total_price,
                item.total_price,
                item.category || 'general'
            ];

            const result = await this.db.query(query, values);
            results.push(result.rows[0]);
        }

        return results;
    }

    async processWithPythonModel(filePath) {
        return new Promise((resolve, reject) => {
            const pythonScript = path.join(this.modelPath, 'process_receipt.py');
            const pythonProcess = spawn('python', [pythonScript, filePath]);

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    logger.error(`Python process failed with code ${code}: ${errorOutput}`);
                    reject(new Error(`AI processing failed: ${errorOutput}`));
                } else {
                    try {
                        const result = JSON.parse(output);
                        resolve(result);
                    } catch (error) {
                        logger.error('Failed to parse AI output:', error);
                        reject(new Error('Invalid AI output format'));
                    }
                }
            });

            pythonProcess.on('error', (error) => {
                logger.error('Python process error:', error);
                reject(new Error('AI processing error'));
            });
        });
    }
}

module.exports = new AIService();