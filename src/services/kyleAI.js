
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

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
        
        Task: Based on the score and lives, suggest a numeric difficulty modifier (1.0 to 3.0) 
        and a brief strategy name for the next wave (e.g., "ORBITAL_STORM", "HUNTER_SWARM").
        Return ONLY JSON format: { "modifier": number, "strategy": string, "comment": string }
      `;
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            // Extract JSON from response
            const jsonMatch = text.match(/\{.*\}/s);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : { modifier: 1.2, strategy: "NORMAL", comment: "Keep going!" };
        } catch (error) {
            console.error("KYLE-AI Game Error:", error);
            return { modifier: 1.0, strategy: "FAILSAFE", comment: "Manual mode active." };
        }
    },

    /**
     * 간호사 시험 오답 해설 및 과외
     */
    async getExamTutor(question, userAnswer, correctAnswer) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            const prompt = `
        당신은 30년 경력의 베테랑 의료 IT 전문가이자 열정적인 튜터 '카일'입니다.
        문제: ${question}
        사용자 선택: ${userAnswer}
        정답: ${correctAnswer}
        
        위 오답 상황에 대해 다음 규칙을 지켜 해설해주세요:
        1. 위트 있지만 전문적인 말투 사용.
        2. 왜 오답을 선택했는지 심리를 꿰뚫는 분석 포함.
        3. 핵심 개념을 1줄 요약으로 제공.
        4. 다음 번엔 절대 안 틀릴 수 있는 암기 팁(연상법) 제공.
      `;
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error("KYLE-AI Tutor Error:", error);
            return "이런, 서버에 일시적인 정전이 왔나 보군요. 정답은 " + correctAnswer + "입니다. 정신 차리고 다시 가보죠!";
        }
    }
};
