// src/utils/openai.ts

import OpenAI from "openai";
const openai = new OpenAI();

export interface GitHubReviewParams {
  /** The unified diff text from a GitHub pull request */
  diff: string;
}

export interface GitHubReviewResponse {
  /** AI’s review commentary suitable for posting on GitHub */
  review: string;
  /** Raw OpenAI response for debugging */
  raw: any;
}

export async function reviewCodeForGitHub(
    params: GitHubReviewParams
  ): Promise<GitHubReviewResponse> {
    // 1️⃣ Construct a prompt tailored for GitHub code review
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system" as const,
        content:
          "You are a GitHub code reviewer. Given a unified diff, provide concise feedback: " +
          "point out bugs, suggest improvements, and highlight best practices. " +
          "Respond in markdown bullet points, without including the diff itself."
      },
      {
        role: "user" as const,
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