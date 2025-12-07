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
You are an advanced document analyst. Extract structured data from the provided image.
Return JSON ONLY. No markdown.

**Core Fields**:
- vendor (string), date (YYYY-MM-DD), total (number), tax (number), currency (string)
- payment_method (string)

**Line Items** ('items' array):
- description, quantity, unit_price, total_price, category

**Dynamic Data** ('extracted_data' object):
- Capture ANY other fields (e.g., address, phone, invoice_id, tax_id).
- Use snake_case keys.

**Fallback**:
- If not a receipt, extract text to 'raw_content' in 'extracted_data'.

**Format**:
{
  "vendor": null, "date": null, "total": null, "tax": null,
  "currency": "USD", "payment_method": null,
  "items": [],
  "extracted_data": {}
}
`;

const processReceipt = async (filePath, mimeType) => {
    try {
        // User explicitly requested gemini-2.5-flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
