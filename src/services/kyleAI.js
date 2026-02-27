import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../hooks/useFirebase";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const FALLBACK_STRATEGIES = [
    { modifier: 1.2, strategy: "ORBITAL_STORM", comment: "궤도 폭풍이 몰아칩니다. 움직임을 넓게 가져가세요!" },
    { modifier: 1.5, strategy: "HUNTER_SWARM", comment: "추격자들이 당신의 흔적을 쫓기 시작했습니다." },
    { modifier: 1.8, strategy: "VOID_COLLAPSE", comment: "공간이 수축합니다. 중앙을 사수하세요!" },
    { modifier: 1.1, strategy: "GHOST_DRIFT", comment: "적들이 보이지 않는 궤도를 그리며 다가옵니다." },
    { modifier: 2.0, strategy: "CTO_CHALLENGE", comment: "제 인내심도 바닥났습니다. 한 번 버텨보시죠!" }
];

/**
 * KYLE-AI Service: 하이젠랩스의 지능형 기능을 담당합니다.
 */
export const kyleAI = {
    /**
     * 게임 난이도 동적 생성 (Adaptive Difficulty)
     */
    async getDynamicDifficulty(playerStats) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `
        Context: You are the AI Engine for 'Zero-G Drift' game.
        Current Player Stats: ${JSON.stringify(playerStats)}
        
        Task: Based on the score and lives, suggest a numeric difficulty modifier (1.2 to 2.5) 
        and a brief strategy name for the next wave (e.g., "ORBITAL_STORM", "HUNTER_SWARM").
        Return ONLY JSON format: { "modifier": number, "strategy": string, "comment": string }
      `;
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            // Extract JSON from response
            const jsonMatch = text.match(/\{.*\}/s);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : this.getFallbackStrategy();
        } catch (error) {
            console.warn("KYLE-AI: Using internal strategy pool (Quota safe).");
            return this.getFallbackStrategy();
        }
    },

    getFallbackStrategy() {
        return FALLBACK_STRATEGIES[Math.floor(Math.random() * FALLBACK_STRATEGIES.length)];
    }
};
