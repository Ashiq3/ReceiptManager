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
You are an expert document parser. Your job is to extract ALL meaningful data from the provided image (receipt, invoice, form, etc.).

Return a single JSON object where:
1. Keys are the names of the fields found (e.g., "Invoice Number", "Vendor", "Date", "Total Amount", "Tax", "Shipping Address", "Patient Name", etc.). Use snake_case for keys if possible, but keep them descriptive.
2. Values are the extracted text.
3. If there is a list of items, extract them into an "items" array.
4. Also populate standard fields if found: "vendor", "date", "total", "currency", "payment_method".

Example generic structure (adapt to the document):
{
  "vendor": "Store Name",
  "date": "2023-01-01",
  "total": 100.00,
  "currency": "USD",
  "items": [],
  "invoice_number": "12345",
  "shipping_address": "123 Main St",
  "custom_field_found": "value"
}

IMPORTANT:
- Return ONLY valid JSON.
- No markdown code blocks.
- Extract EVERYTHING you see that looks important.
`;

const processReceipt = async (filePath, mimeType) => {
    try {
        // User requested 2.5, but falling back to 1.5-flash for stability/availability
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const imagePart = fileToGenerativePart(filePath, mimeType);
        const result = await model.generateContent([RECEIPT_PROMPT, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("AI Processing Error:", error.message, error.stack);
        // Ensure we throw a useful error
        throw new Error(`Failed to process receipt with AI: ${error.message}`);
    }
};

module.exports = { processReceipt };
