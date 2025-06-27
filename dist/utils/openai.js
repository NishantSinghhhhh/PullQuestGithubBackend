"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCodeWithAI = reviewCodeWithAI;
// src/utils/openai.ts
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY, // must be a *secret* “sk-” key
});
async function reviewCodeWithAI(params) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: "You are an AI coding assistant. When given a coding question, respond with ONLY the complete, working C++ code solution. Do not include explanations or comments.",
            },
            {
                role: "user",
                content: `I'm currently in a live coding assessment/interview. Problem:\n\n${params.code}`,
            },
        ],
        temperature: 0.2,
        max_tokens: 800,
    });
    const reply = completion.choices?.[0]?.message?.content?.trim() ?? "";
    return { reply };
}
//# sourceMappingURL=openai.js.map