"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCodeForGitHub = reviewCodeForGitHub;
// src/utils/openai.ts
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default();
async function reviewCodeForGitHub(params) {
    const messages = [
        {
            role: "system",
            content: `You are a GitHub code reviewer. Given a unified diff, return ONLY a valid JSON array of review suggestions.

        Each element must be an object with these exact properties:
        - "file": string (path to the file relative to repo root, extracted from the diff)
        - "line": integer (line number where the comment should be placed)
        - "side": "RIGHT" (for new code) or "LEFT" (for deleted code)
        - "comment": string (your concise review comment in markdown)

        CRITICAL: Return ONLY the JSON array. Do not wrap it in markdown code blocks. Do not include any other text, explanations, or formatting. Just the raw JSON array starting with [ and ending with ].

        Example format:
        [
        {
            "file": "src/example.ts",
            "line": 10,
            "side": "RIGHT",
            "comment": "Consider using const instead of let for immutable variables"
        }
        ]`
        },
        {
            role: "user",
            content: params.diff
        }
    ];
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.1, // Lower temperature for more consistent JSON output
        max_tokens: 1000
    });
    console.log("🤖 OpenAI review request completed");
    const review = completion.choices?.[0]?.message?.content?.trim() ?? "";
    return { review, raw: completion };
}
//# sourceMappingURL=githubcodereview.js.map