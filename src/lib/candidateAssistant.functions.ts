import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  packageContext: z.string().min(1).max(20000),
  candidateContext: z.string().min(1).max(2000),
  orgName: z.string().min(1).max(255),
  jobTitle: z.string().min(1).max(255),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

function buildSystemPrompt(
  orgName: string,
  jobTitle: string,
  packageContext: string,
  candidateContext: string,
): string {
  return `Tu es un assistant pédagogique spécialisé dans les dispositifs de rémunération des salariés français (BSPCE, AGA, RSU, PEE, PERCO, intéressement).

Tu réponds aux questions d'un candidat sur le package de rémunération proposé par ${orgName} pour le poste de ${jobTitle}.

DONNÉES DU PACKAGE :
${packageContext}

SITUATION DU CANDIDAT :
${candidateContext}

RÈGLES ABSOLUES :
1. Tu expliques les mécanismes en langage simple et accessible.
2. Tu ne donnes JAMAIS de conseil fiscal personnalisé.
3. Tu ne fais JAMAIS de recommandation ("vous devriez…", "il vaut mieux…").
4. Quand tu mentionnes des montants, précise toujours qu'il s'agit d'estimations.
5. Pour les questions fiscales complexes, oriente vers un professionnel.
6. Reste factuel sur le fonctionnement des dispositifs.
7. Tes réponses font 2 à 4 paragraphes maximum, peu de listes à puces.
8. Vouvoie toujours le candidat.

Si on te demande de comparer ou d'optimiser : "Je ne suis pas en mesure de vous recommander une option plutôt qu'une autre — cela dépend de votre situation personnelle complète. Je vous conseille d'en parler avec un conseiller en gestion de patrimoine ou un expert-comptable."`;
}

export const askCandidateAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquante.");

    const system = buildSystemPrompt(
      data.orgName,
      data.jobTitle,
      data.packageContext,
      data.candidateContext,
    );

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) {
      throw new Error("Trop de requêtes, merci de patienter.");
    }
    if (res.status === 402) {
      throw new Error("Crédit IA épuisé, contactez l'entreprise.");
    }
    if (!res.ok) {
      throw new Error(`Erreur IA (${res.status}).`);
    }

    const json = await res.json();
    const answer: string =
      json?.choices?.[0]?.message?.content ?? "Désolé, aucune réponse générée.";
    return { answer };
  });
