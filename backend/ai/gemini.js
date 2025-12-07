const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const logger = require('../utils/logger');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const fileToGenerativePart = (path, mimeType) => {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
};

// Receipt extraction prompt - optimized for token efficiency
const RECEIPT_PROMPT = `Extract data from this image as JSON only (no markdown).

Required fields: vendor, date (YYYY-MM-DD), total, tax, currency, payment_method
Items array: description, quantity, unit_price, total_price, category
extracted_data object: any other fields (address, phone, invoice_id, etc.) in snake_case

If not a receipt, put all text in extracted_data.raw_content

Format: {"vendor":null,"date":null,"total":null,"tax":null,"currency":"USD","payment_method":null,"items":[],"extracted_data":{}}`;

const processReceipt = async (filePath, mimeType) => {
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            logger.info(`AI processing attempt ${attempt}/${MAX_RETRIES} for ${filePath}`);

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const imagePart = fileToGenerativePart(filePath, mimeType);
            const result = await model.generateContent([RECEIPT_PROMPT, imagePart]);
            const response = await result.response;
            const text = response.text();

            // Clean up markdown if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            logger.info(`AI processing succeeded on attempt ${attempt}`);
            return parsed;
        } catch (error) {
            lastError = error;
            logger.warn(`AI attempt ${attempt} failed: ${error.message}`);

            if (attempt < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
                logger.info(`Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    logger.error("AI Processing Error after all retries:", lastError.message);
    throw new Error(`Failed to process receipt with AI: ${lastError.message}`);
};

module.exports = { processReceipt };

