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
You are an advanced AI document analyst. Your goal is to extract EVERY piece of meaningful information from the provided image (receipt, invoice, form, etc.).
Be extremely detailed. Do not summarize.

INSTRUCTIONS:
1.  **Standard Fields**: Extract 'vendor' (store name), 'date' (YYYY-MM-DD), 'total' (number), 'tax' (number), 'currency' (e.g., 'USD'), 'payment_method'.
2.  **Line Items**: Extract all line items into an 'items' array. Each item should have: 'description', 'quantity', 'unit_price', 'total_price', 'category'.
3.  **Dynamic Data (CRITICAL)**: Extract ANY other text that looks like a field or meaningful data into an "extracted_data" object.
    *   Examples: "Store Address", "Phone Number", "Website", "Cashier Name", "Time", "Tax ID", "Invoice Number", "Reference Code", "Table Number", "Guest Count", "Tip", "Service Charge".
    *   Use snake_case for keys (e.g., "merchant_address", "tax_number", "cashier_name").
    *   Capture EVERYTHING you can read that isn't a standard field.
4.  **Fallback (Universal Extraction)**: If the document is NOT a receipt or form (e.g., a screenshot of code, a letter, a sign), extract the main text content into a key called "raw_content" or "document_text" inside "extracted_data". NEVER return an empty object.

RETURN JSON ONLY.
Structure:
{
  "vendor": "Store Name", // or null
  "date": "2023-01-01",   // or null
  "total": 100.00,        // or null
  "tax": 8.50,
  "currency": "USD",
  "payment_method": "Credit Card",
  "items": [],
  "extracted_data": {
    "merchant_address": "123 Main St, City, State",
    "document_summary": "Screenshot of a coding environment showing...",
    "raw_content": "Full text of the document..."
  }
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
