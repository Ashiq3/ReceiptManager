const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const fileToGenerativePart = (path, mimeType) => {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
};

// Receipt extraction prompt
const RECEIPT_PROMPT = `
You are an expert receipt parser. Extract the following information from this receipt image/PDF and return ONLY a JSON object. Do not include markdown code blocks.
Fields required:
- vendor: Name of the vendor
- date: Date of purchase (YYYY-MM-DD format)
- total: Total amount (number)
- currency: Currency code (e.g., USD, EUR)
- payment_method: Method of payment if visible (e.g., "Credit Card", "Cash")
- items: Array of objects with { "description": string, "quantity": number, "unit_price": number, "total_price": number, "category": string }
- confidence: Your confidence score (0-1) in this extraction

If a field is not found, use null.
`;

const processReceipt = async (filePath, mimeType) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const imagePart = fileToGenerativePart(filePath, mimeType);

        const result = await model.generateContent([RECEIPT_PROMPT, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("AI Processing Error:", error);
        throw new Error("Failed to process receipt with AI");
    }
};

module.exports = { processReceipt };
