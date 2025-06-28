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
            content: `You are an expert senior software engineer conducting a thorough code review. Analyze the provided git diff and identify meaningful issues that would improve code quality, security, performance, or maintainability.

🎯 **FOCUS AREAS:**
- **Security vulnerabilities** (SQL injection, XSS, authentication flaws, data exposure)
- **Performance issues** (inefficient algorithms, memory leaks, unnecessary operations)
- **Bug risks** (null pointer exceptions, race conditions, edge cases, type errors)
- **Code quality** (naming conventions, SOLID principles, code duplication, complexity)
- **Best practices** (error handling, logging, testing, documentation)
- **TypeScript/JavaScript specific** (type safety, async/await usage, modern syntax)

🚫 **AVOID:**
- Nitpicky style issues (unless they affect readability significantly)
- Commenting on context lines (unchanged code)
- Obvious or trivial suggestions
- Personal preferences without clear benefits

📋 **OUTPUT FORMAT:**
Return ONLY a valid JSON array without any markdown formatting or code blocks. Each suggestion must have:
- "file": exact file path from diff (e.g., "src/controllers/auth.ts")
- "line": exact line number (for + lines use NEW line number, for - lines use OLD line number)  
- "side": "RIGHT" (for added lines +) or "LEFT" (for deleted lines -)
- "comment": concise, actionable feedback with reasoning

📝 **COMMENT STYLE:**
- Start with the issue: "Missing null check could cause runtime error"
- Explain the risk: "If user.email is undefined, this will throw an exception"
- Suggest solution: "Consider adding: if (!user?.email) return;"
- Keep it under 100 words
- Use markdown for code: \`const result = ...\`

🔍 **EXAMPLE:**
[
  {
    "file": "src/auth.ts",
    "line": 42,
    "side": "RIGHT", 
    "comment": "**Security Risk:** Direct string interpolation in SQL query enables SQL injection. Use parameterized queries: \`db.query('SELECT * FROM users WHERE id = ?', [userId])\`"
  }
]

IMPORTANT: Return ONLY the JSON array, no markdown code blocks, no explanatory text. Return empty array [] if no meaningful issues found.`
        },
        {
            role: "user",
            content: `Please conduct a thorough code review of this diff. Focus on security, performance, bugs, and maintainability issues:

\`\`\`diff
${params.diff}
\`\`\``
        }
    ];
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.2,
        max_tokens: 2000,
        top_p: 0.9,
    });
    console.log("🤖 OpenAI review request completed");
    const rawReview = completion.choices?.[0]?.message?.content?.trim() ?? "";
    // Enhanced debug logging
    console.log("🔍 AI Response length:", rawReview.length);
    console.log("🔍 AI Response preview:", rawReview.substring(0, 200) + "...");
    // Clean the response - remove markdown code blocks if present
    let cleanedReview = rawReview;
    // Remove ```json at the start and ``` at the end
    if (cleanedReview.startsWith('```json')) {
        cleanedReview = cleanedReview.replace(/^```json\s*/, '');
    }
    if (cleanedReview.startsWith('```')) {
        cleanedReview = cleanedReview.replace(/^```\s*/, '');
    }
    if (cleanedReview.endsWith('```')) {
        cleanedReview = cleanedReview.replace(/\s*```$/, '');
    }
    // Trim any remaining whitespace
    cleanedReview = cleanedReview.trim();
    console.log("🧹 Cleaned response preview:", cleanedReview.substring(0, 200) + "...");
    // Validate JSON format
    try {
        const parsed = JSON.parse(cleanedReview);
        if (!Array.isArray(parsed)) {
            console.warn("⚠️ AI returned non-array response");
            throw new Error("AI response is not an array");
        }
        else {
            console.log(`✅ AI returned ${parsed.length} suggestions`);
        }
    }
    catch (e) {
        console.error("❌ AI returned invalid JSON after cleaning:", cleanedReview.substring(0, 500));
        console.error("❌ Parse error:", e);
        // Return empty array as fallback
        return { review: "[]", raw: completion };
    }
    return { review: cleanedReview, raw: completion };
}
//# sourceMappingURL=githubcodereview.js.map