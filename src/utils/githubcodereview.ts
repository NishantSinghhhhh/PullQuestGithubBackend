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
      content: `You are a GitHub code reviewer. Given a unified diff, return ONLY a valid JSON array of review suggestions.

    IMPORTANT: Only comment on lines that are actually CHANGED in the diff (lines starting with + or -). 
    Do NOT comment on context lines (lines starting with space) unless absolutely necessary.

    Each element must be an object with these exact properties:
    - "file": string (exact file path from the diff, e.g., "src/index.ts")
    - "line": integer (the EXACT line number from the diff - for + lines use the NEW line number, for - lines use the OLD line number)
    - "side": "RIGHT" (for new/added code with +) or "LEFT" (for deleted code with -)
    - "comment": string (your concise review comment in markdown)

    CRITICAL RULES:
    1. Return ONLY the JSON array. No markdown code blocks. No explanations.
    2. Only suggest comments for lines that are actually modified (+ or - lines)
    3. Use the exact line numbers that appear in the diff
    4. Focus on meaningful issues: bugs, security, performance, best practices
    5. Keep comments concise and actionable

    Example format:
    [
      {
        "file": "src/example.ts",
        "line": 85,
        "side": "RIGHT",
        "comment": "Consider using const instead of let for immutable variables"
      }
    ]`
    },
    {
      role: "user" as const,
      content: `Please review this diff and provide suggestions only for the changed lines:\n\n${params.diff}`
    }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.1,
    max_tokens: 1500
  });

  console.log("🤖 OpenAI review request completed");

  const review = completion.choices?.[0]?.message?.content?.trim() ?? "";
  
  // Debug: Log the AI response
  console.log("🔍 AI Response:", review);

  return { review, raw: completion };
}