// Server-only helper for Anthropic Claude API.
// Never import this file from client code.

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

interface CallOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
}

export async function callClaude({
  systemPrompt,
  userPrompt,
  maxTokens = 1000,
  jsonMode = false,
  model = DEFAULT_MODEL,
}: CallOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const system = jsonMode
    ? `${systemPrompt}\n\nRéponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans backticks.`
    : systemPrompt;

  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const data = (await res.json()) as {
    content?: { text?: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? `Claude API error ${res.status}`);
  }

  const text = data.content?.[0]?.text ?? "";
  return jsonMode ? text.replace(/```json|```/g, "").trim() : text;
}
