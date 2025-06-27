"use strict";
// src/utils/openai.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCodeForGitHub = reviewCodeForGitHub;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default();
async function reviewCodeForGitHub(params) {
    // 1️⃣ Construct a prompt tailored for GitHub code review
    const messages = [
        {
            role: "system",
            content: "You are a GitHub code reviewer. Given a unified diff, provide concise feedback: " +
                "point out bugs, suggest improvements, and highlight best practices. " +
                "Respond in markdown bullet points, without including the diff itself."
        },
        {
            role: "user",
            content: params.diff
        }
    ];
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
        max_tokens: 1000
    });
    console.log("🛰️ OpenAI GitHub review raw response:", JSON.stringify(completion, null, 2));
    const review = completion.choices?.[0]?.message?.content?.trim() ?? "";
    return { review, raw: completion };
}
//# sourceMappingURL=githubcodereview.js.map