// src/utils/openai.ts
import OpenAI from "openai"

export interface ReviewCodeParams {
  code: string
}

export interface ReviewCodeResponse {
  reply: string
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,            // must be a *secret* “sk-” key
})

export async function reviewCodeWithAI(
  params: ReviewCodeParams
): Promise<ReviewCodeResponse> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", 
    messages: [
      {
        role: "system",
        content:
          "You are an AI coding assistant. When given a coding question, respond with ONLY the complete, working C++ code solution. Do not include explanations or comments.",
      },
      {
        role: "user",
        content:
          `I'm currently in a live coding assessment/interview. Problem:\n\n${params.code}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 800,
  })

  const reply = completion.choices?.[0]?.message?.content?.trim() ?? ""
  return { reply }
}
