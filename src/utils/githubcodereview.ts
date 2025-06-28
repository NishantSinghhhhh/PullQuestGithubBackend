// src/utils/openai.ts
import OpenAI from "openai";

const openai = new OpenAI();

export interface GitHubReviewParams {
  /** The unified diff text from a GitHub pull request */
  diff: string;
}

export interface GitHubReviewResponse {
  /** AI's review commentary suitable for posting on GitHub */
  review: string;
  /** Raw OpenAI response for debugging */
  raw: any;
}

export async function reviewCodeForGitHub(
  params: GitHubReviewParams
): Promise<GitHubReviewResponse> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system" as const,
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
Return ONLY a valid JSON array. Each suggestion must have:
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

Return empty array [] if no meaningful issues found.`
    },
    {
      role: "user" as const,
      content: `Please conduct a thorough code review of this diff. Focus on security, performance, bugs, and maintainability issues:

\`\`\`diff
${params.diff}
\`\`\``
    }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.2, // Slightly higher for more creative problem-spotting
    max_tokens: 2000, // Increased for more detailed reviews
    top_p: 0.9, // Focus on high-probability completions
  });

  console.log("🤖 OpenAI review request completed");

  const review = completion.choices?.[0]?.message?.content?.trim() ?? "";
  
  // Enhanced debug logging
  console.log("🔍 AI Response length:", review.length);
  console.log("🔍 AI Response preview:", review.substring(0, 200) + "...");
  
  // Validate JSON format
  try {
    const parsed = JSON.parse(review);
    if (!Array.isArray(parsed)) {
      console.warn("⚠️ AI returned non-array response");
    } else {
      console.log(`✅ AI returned ${parsed.length} suggestions`);
    }
  } catch (e) {
    console.error("❌ AI returned invalid JSON:", review.substring(0, 500));
  }

  return { review, raw: completion };
}