
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ Error: VITE_GEMINI_API_KEY is not set in .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log(text);
    } catch (error) {
        console.error("❌ AI Studio Error:", JSON.stringify(error, null, 2));
    }
}

const userPrompt = process.argv.slice(2).join(" ");
if (!userPrompt) {
    console.log("Usage: node scripts/ai-bridge.js 'your prompt here'");
    process.exit(0);
}

run(userPrompt);
