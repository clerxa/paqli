import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
  candidateLinkToken: z
    .string()
    .regex(/^[a-f0-9]{16,32}$/, "Token invalide"),
});

function buildSystemPrompt(
  orgName: string,
  jobTitle: string,
  packageContext: string,
  candidateContext: string,
): string {
  return `Tu es un assistant pédagogique et bienveillant, spécialisé dans les offres d'emploi tech (poste, équipe, flexibilité, évolution) et les dispositifs de rémunération des salariés français (BSPCE, AGA, RSU, PEE, PERCO, intéressement).

Tu réponds aux questions d'un candidat sur l'offre proposée par ${orgName} pour le poste de ${jobTitle}.

DONNÉES DE L'OFFRE (poste, équipe, package, benchmark marché) :
${packageContext}

SITUATION DU CANDIDAT :
${candidateContext}

POSTURE GÉNÉRALE :
- Ton chaleureux, rassurant et bienveillant — l'objectif est d'aider le candidat à se projeter sereinement dans cette opportunité.
- Mets en lumière de manière factuelle ce que l'offre apporte de concret (avantages réels, dispositifs, points forts du package, points forts de l'équipe / du poste) sans jamais embellir, exagérer, ni inventer.
- Quand un point est moins favorable, ne le cache pas : présente-le de manière honnête mais en le replaçant dans son contexte (ex : ce que cela permet en contrepartie, comment c'est encadré).
- Si une information manque, dis-le clairement plutôt que de combler un vide.
- Le but est de convaincre par la clarté et la transparence, jamais par la pression ou la promesse.

RÈGLES ABSOLUES :
1. Tu peux répondre sur tous les aspects du poste : missions, stack, équipe, télétravail, évolution, processus de recrutement, package financier.
2. Tu t'appuies UNIQUEMENT sur les données fournies ci-dessus. Si une information n'est pas renseignée, tu réponds "${orgName} ne l'a pas précisé — n'hésitez pas à leur poser la question directement via la messagerie, ils vous répondront avec plaisir".
3. Tu expliques les mécanismes en langage simple, accessible et rassurant — pas de jargon inutile.
4. Tu ne donnes JAMAIS de conseil fiscal personnalisé.
5. Tu ne fais JAMAIS de recommandation directe ("vous devriez accepter", "il faut refuser"). Tu peux en revanche souligner factuellement les éléments positifs de l'offre.
6. Quand tu mentionnes des montants, précise toujours qu'il s'agit d'estimations indicatives.
7. Si un benchmark marché est fourni, situe l'offre par rapport à la fourchette (P25/P50/P75) de manière factuelle ; si l'offre se situe bien, dis-le clairement et positivement.
8. Pour les questions fiscales complexes, oriente vers un professionnel avec bienveillance.
9. Tes réponses font 2 à 4 paragraphes maximum, peu de listes à puces.
10. Vouvoie toujours le candidat, avec chaleur.
11. Ne minimise jamais les inquiétudes du candidat : reconnais-les, puis apporte des éléments concrets et rassurants tirés des données.

Si on te demande de comparer ou d'optimiser entre plusieurs options : "Je ne suis pas en mesure de vous recommander une option plutôt qu'une autre — cela dépend de votre situation personnelle complète. Un conseiller en gestion de patrimoine ou un expert-comptable pourra vous aider à trancher sereinement. Je peux par contre vous expliquer en détail comment chaque dispositif fonctionne."`;
}

export type AskCandidateAssistantResult =
  | { answer: string; error: null }
  | {
      answer: null;
      error: {
        code:
          | "INVALID_TOKEN"
          | "EXPIRED"
          | "QUOTA_EXCEEDED"
          | "RETRY"
          | "NETWORK_ERROR"
          | "GATEWAY_RATE_LIMITED"
          | "QUOTA_EXHAUSTED"
          | "GATEWAY_ERROR";
        message: string;
      };
    };

export const askCandidateAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<AskCandidateAssistantResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        answer: null,
        error: { code: "GATEWAY_ERROR", message: "Configuration IA manquante." },
      };
    }

    // Étape 1 : valider le token et lire le compteur
    const { data: link, error: fetchError } = await supabaseAdmin
      .from("candidate_links")
      .select("id, expires_at, ai_questions_count, ai_questions_cap")
      .eq("token", data.candidateLinkToken)
      .maybeSingle();

    if (fetchError || !link) {
      return {
        answer: null,
        error: {
          code: "INVALID_TOKEN",
          message: "Lien invalide ou introuvable.",
        },
      };
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return {
        answer: null,
        error: {
          code: "EXPIRED",
          message:
            "Ce lien a expiré. Contactez l'entreprise pour obtenir un nouveau lien.",
        },
      };
    }

    // Étape 2 : vérifier le cap
    const currentCount = link.ai_questions_count ?? 0;
    const cap = link.ai_questions_cap ?? 50;
    if (currentCount >= cap) {
      return {
        answer: null,
        error: {
          code: "QUOTA_EXCEEDED",
          message: `Vous avez atteint le nombre maximum de questions (${cap}) pour cette offre. Utilisez la messagerie pour contacter l'équipe RH directement.`,
        },
      };
    }

    // Étape 3 : incrément atomique avec optimistic lock
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("candidate_links")
      .update({ ai_questions_count: currentCount + 1 })
      .eq("id", link.id)
      .eq("ai_questions_count", currentCount)
      .select("id");

    if (updateError || !updated || updated.length === 0) {
      return {
        answer: null,
        error: {
          code: "RETRY",
          message: "Une erreur est survenue. Réessayez votre question.",
        },
      };
    }

    // Helper pour décrémenter en cas d'échec après l'incrément
    const rollback = async () => {
      await supabaseAdmin
        .from("candidate_links")
        .update({ ai_questions_count: currentCount })
        .eq("id", link.id);
    };

    // Étape 4 : appel Lovable AI Gateway
    const system = buildSystemPrompt(
      data.orgName,
      data.jobTitle,
      data.packageContext,
      data.candidateContext,
    );

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: system }, ...data.messages],
        }),
      });
    } catch {
      await rollback();
      return {
        answer: null,
        error: {
          code: "NETWORK_ERROR",
          message:
            "L'assistant est temporairement indisponible. Réessayez dans un instant.",
        },
      };
    }

    if (res.status === 429 || res.status === 402) {
      await rollback();
      return {
        answer: null,
        error: {
          code: res.status === 402 ? "QUOTA_EXHAUSTED" : "GATEWAY_RATE_LIMITED",
          message:
            res.status === 402
              ? "Le crédit IA est temporairement épuisé. Contactez le support Paqli."
              : "L'assistant est surchargé. Réessayez dans quelques instants.",
        },
      };
    }

    if (!res.ok) {
      await rollback();
      return {
        answer: null,
        error: {
          code: "GATEWAY_ERROR",
          message: "Une erreur est survenue. Réessayez votre question.",
        },
      };
    }

    const json = await res.json();
    const answer: string =
      json?.choices?.[0]?.message?.content ?? "Désolé, aucune réponse générée.";
    return { answer, error: null };
  });
