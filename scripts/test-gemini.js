require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    console.log("1. Reading API Key...");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is missing in .env");
        return;
    }
    console.log("   Key found:", apiKey.substring(0, 10) + "...");

    console.log("2. Initializing Gemini Client...");
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Use the exact model name user requested
        const modelName = "gemini-2.5-flash";
        console.log(`3. Requesting model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });

        console.log("4. Sending test prompt: 'Explain what you are in one sentence.'...");
        const result = await model.generateContent("Explain what you are in one sentence.");
        const response = await result.response;
        const text = response.text();

        console.log("\n✅ SUCCESS! Model responded:");
        console.log("---------------------------------------------------");
        console.log(text);
        console.log("---------------------------------------------------");

    } catch (error) {
        console.error("\n❌ ERROR FAILED:");
        console.error("   Message:", error.message);
        if (error.message.includes("404")) {
            console.error("   Analysis: The model name might be wrong or not available to your key.");
            console.error("   Try 'gemini-1.5-flash' or 'gemini-pro' instead.");
        }
        if (error.message.includes("403")) {
            console.error("   Analysis: API Key invalid or expired.");
        }
    }
}

testGemini();
