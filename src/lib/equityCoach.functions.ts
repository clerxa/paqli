import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude } from "./claudeApi.server";
import { buildEquityCoachSystemPrompt } from "./vega/knowledge";

/**
 * Assistant equity (RH).
 * Répond aux questions du RH sur la fiscalité equity en français.
 * Contexte : la base de connaissance VEGA + le package en cours (optionnel).
 */
export const askEquityCoachFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        question: z.string().min(3).max(2000),
        packageContext: z.string().max(4000).optional(),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(4000),
            }),
          )
          .max(20)
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const systemPrompt = buildEquityCoachSystemPrompt(data.packageContext);

    // Concatène l'historique + la nouvelle question dans le userPrompt
    // (callClaude attend un userPrompt unique).
    const historyText =
      data.history && data.history.length > 0
        ? data.history
            .map(
              (m) =>
                `${m.role === "user" ? "RH" : "Assistant"} : ${m.content}`,
            )
            .join("\n\n")
        : "";

    const userPrompt = historyText
      ? `${historyText}\n\nRH : ${data.question}\n\nAssistant :`
      : data.question;

    const answer = await callClaude({
      systemPrompt,
      userPrompt,
      maxTokens: 700,
      caller: "askEquityCoach",
    });

    return { answer: answer.trim() };
  });
