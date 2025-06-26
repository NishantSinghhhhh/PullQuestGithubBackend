// src/lib/openai.ts

export interface ReviewCodeParams {
    /**
     * The coding problem prompt to send to OpenAI
     */
    code: string;
  }
  
  export interface ReviewCodeResponse {
    /**
     * The pure C++ code solution returned by OpenAI
     */
    reply: string;
  }
  
  /**
   * Sends the user’s coding problem directly to OpenAI’s REST API
   * and returns the assistant’s reply as pure C++ code.
   * (This runs server-side; ensure process.env.OPENAI_API_KEY is set.)
   */
  export async function reviewCodeWithAI(
    params: ReviewCodeParams
  ): Promise<ReviewCodeResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY in environment");
    }
  
    const url = "https://api.openai.com/v1/chat/completions";
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "o3",
        messages: [
          {
            role: "system",
            content: "You are an AI coding assistant. When given a coding question, respond with ONLY the complete, working C++ code solution. Do not include explanations or comments.",
          },
          {
            role: "user",
            content: `I'm currently in a live coding assessment/interview and need immediate help. I will provide you with a coding problem and you must respond with ONLY the complete, working C++ code solution. Requirements:\n- Provide ONLY the C++ code, no explanations or comments\n- Code must be complete and ready to compile/run\n- Use standard C++ libraries and best practices\n- Focus on correctness and efficiency\n- Include all necessary headers\n- No additional text, just pure code\n\nProblem: ${params.code}`,
          },
        ],
      }),
    });
  
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(
        `OpenAI API error: ${resp.status} ${resp.statusText} — ${text}`
      );
    }
  
    const json = (await resp.json()) as any;
    const reply = json.choices?.[0]?.message?.content ?? "";
  
    return { reply };
  }
  