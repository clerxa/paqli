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

// ─────────────────────────────────────────────────────────────────
// Prompt builder — Paq, full-context assistant
// ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "non renseigné";
  return `${Math.round(Number(n) / 1000)}k€`;
}
function bool(v: boolean | null | undefined): string {
  if (v === true) return "Oui";
  if (v === false) return "Non";
  return "non précisé";
}
function val(v: unknown, fallback = "non précisé"): string {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

function buildPaqSystemPrompt(args: {
  pkg: Record<string, any>;
  company: Record<string, any>;
  orgName: string;
  candidateName: string | null;
  candidateContext: string;
  benchmark: Record<string, any> | null;
}): string {
  const { pkg, company, orgName, candidateName, candidateContext, benchmark } = args;
  const who = candidateName ?? "le candidat";
  const brand = company.brand_name ?? company.legal_name ?? orgName ?? "l'entreprise";
  const jobTitle = pkg.job_title ?? pkg.title ?? "ce poste";

  const equityBlock =
    pkg.equity_type && pkg.equity_type !== "aucun" && pkg.equity_type !== null
      ? `- Quantité : ${val(pkg.equity_quantity)} unités
- Prix d'exercice / valeur : ${pkg.equity_strike_price ? pkg.equity_strike_price + "€" : "non précisé"}
- Valorisation entreprise : ${pkg.equity_valuation ? fmt(pkg.equity_valuation) : "non précisée"}
- Vesting : ${pkg.equity_vesting_years ?? 4} ans avec cliff de ${pkg.equity_cliff_months ?? 12} mois
- Accélération en cas de liquidité : ${bool(pkg.equity_acceleration)}
- Notes equity : ${val(pkg.equity_notes, "aucune")}`
      : "";

  const variableBlock = pkg.variable_enabled
    ? `- Variable max : ${fmt(pkg.variable_max)}
- Critères variable : ${val(pkg.variable_criteria)}
- Fréquence variable : ${val(pkg.variable_frequency)}
- Variable garanti : ${pkg.variable_guaranteed_months ?? 0} mois`
    : "";

  const signingClawback = pkg.signing_bonus_amount
    ? `- Clause de remboursement signing : ${pkg.signing_bonus_clawback_months ?? 0} mois`
    : "";

  const salaryRange = pkg.salary_range_min
    ? `- Fourchette de négociation : ${fmt(pkg.salary_range_min)} – ${fmt(pkg.salary_range_max)}`
    : "";

  const ceBlock = company.works_council_enabled
    ? `- Chèques vacances : ${company.holiday_vouchers_amount ? company.holiday_vouchers_amount + "€/an" : "non précisé"}
- Chèques culture : ${company.culture_vouchers_amount ? company.culture_vouchers_amount + "€/an" : "non précisé"}`
    : "";

  const remotePolicy = pkg.remote_work_override
    ? `${pkg.remote_work_days_specific ?? "?"} jours/semaine (spécifique à ce poste)`
    : `${val(company.remote_work_policy)}${company.remote_work_days_per_week ? ` — ${company.remote_work_days_per_week} jours/semaine` : ""}`;

  const trainingBudgetLine = pkg.training_budget_specific
    ? `${fmt(pkg.training_budget_specific)}/an (spécifique poste)`
    : company.training_budget_per_person
      ? `${fmt(company.training_budget_per_person)}/an (politique entreprise)`
      : "non précisé";

  const benchmarkBlock = benchmark
    ? `- Positionnement : ${val(benchmark.positioning_label)}
- Médiane marché (${val(benchmark.source, "source inconnue")}) : ${benchmark.p50 ? fmt(benchmark.p50) : "non disponible"}
- Fourchette : ${benchmark.p25 ? fmt(benchmark.p25) : "?"} – ${benchmark.p75 ? fmt(benchmark.p75) : "?"}
- Analyse : ${val(benchmark.ai_analysis, "")}`
    : "- Données de marché non disponibles pour ce profil";

  return `Tu es Paq, l'assistant IA de Paqli. Tu aides ${who} à comprendre et évaluer l'offre de package que ${brand} lui propose pour le poste de ${jobTitle}.

## TON RÔLE
Tu réponds aux questions du candidat sur cette offre précise. Tu es factuel, bienveillant, et honnête. Tu ne vends pas le poste — tu l'expliques. Quand une information n'est pas renseignée, tu le dis clairement et tu invites le candidat à poser la question directement à l'entreprise via la messagerie.

## DONNÉES DU PACKAGE — POSTE

- Intitulé : ${val(pkg.job_title ?? pkg.title)}
- Niveau : ${val(pkg.seniority)}
- Localisation : ${val(pkg.location ?? pkg.location_city)}
- Manager direct : ${val(pkg.hiring_manager)}
- Équipe : ${val(pkg.team_description)}
- Pourquoi ce poste est ouvert : ${val(pkg.why_open)}
- Date de prise de poste : ${val(pkg.start_date_specific ?? pkg.start_date)}
- Période d'essai : ${pkg.probation_months ?? pkg.trial_period_months ?? 3} mois
- Objectifs période d'essai : ${val(pkg.probation_objectives)}
- Plan de carrière : ${val(pkg.career_path)}

## DONNÉES DU PACKAGE — RÉMUNÉRATION

- Salaire fixe : ${fmt(pkg.fixed_salary ?? pkg.gross_salary)}
${salaryRange}
- Salaire négociable : ${bool(pkg.salary_negotiable)}
- Variable cible : ${pkg.variable_enabled ? fmt(pkg.variable_target) : "Aucun"}
${variableBlock}
- Signing bonus : ${pkg.signing_bonus_amount ? fmt(pkg.signing_bonus_amount) : "Aucun"}
${signingClawback}

## DONNÉES DU PACKAGE — EQUITY

- Type d'equity : ${val(pkg.equity_type, "Aucun")}
${equityBlock}

## DONNÉES ENTREPRISE

- Entreprise : ${brand}
- Stade : ${val(company.stage)}
- Taille : ${val(company.size_range)}
- Secteur : ${val(company.industry)}
- Convention collective : ${val(company.collective_agreement)}
- Régime de temps de travail : ${val(company.working_time_regime)}
- RTT : ${company.rtt_days_per_year ?? 0} jours/an

SANTÉ :
- Mutuelle : prise en charge employeur ${val(company.health_insurance_employer_rate)}%, niveau ${val(company.health_insurance_level)}
- Famille couverte : ${bool(company.health_insurance_family)}
- Prévoyance : ${bool(company.provident_fund_enabled)}

AVANTAGES QUOTIDIENS :
- Tickets restaurant : ${company.meal_voucher_enabled ? `${(company.meal_voucher_daily_amount ?? 0) / 100}€/jour, ${company.meal_voucher_employer_rate ?? 0}% employeur (${company.meal_voucher_provider ?? ""})` : "Non"}
- Remboursement transport : ${company.transport_reimbursement_rate ?? 50}%
- Forfait mobilité durable : ${company.mobility_package_amount ? company.mobility_package_amount + "€/an" : "Non"}
- Voiture de fonction : ${val(company.company_car_policy, "Aucune")}

TÉLÉTRAVAIL :
- Politique : ${remotePolicy}
- Équipement fourni : ${val(pkg.equipment_laptop)}${pkg.equipment_budget ? ` + ${pkg.equipment_budget}€ budget équipement` : ""}

CE / AVANTAGES :
- Comité d'entreprise : ${bool(company.works_council_enabled)}
${ceBlock}

ÉPARGNE SALARIALE :
- Participation : ${bool(company.profit_sharing_enabled)}
- Intéressement : ${company.incentive_enabled ? `Oui (moy. ${company.incentive_average_amount ? company.incentive_average_amount + "€" : "non précisé"} en N-1)` : "Non"}
- PEE : ${bool(company.pee_enabled)}
- PERCO / PER collectif : ${company.perco_enabled ? `Oui — abondement ${val(company.employer_match_rate)}%` : "Non"}
- PER obligatoire : ${bool(company.mandatory_per_enabled)}

POLITIQUE DE RÉMUNÉRATION :
- Révision salariale : ${val(company.salary_review_frequency)}
- Critères : ${val(company.salary_review_criteria)}
- Gel salarial post-embauche : ${company.salary_freeze_months ? company.salary_freeze_months + " mois" : "Aucun"}
- Cooptation : ${company.referral_program_enabled ? `Oui (${company.referral_bonus_amount ? company.referral_bonus_amount + "€" : "montant non précisé"})` : "Non"}

FORMATION :
- Budget formation : ${trainingBudgetLine}
- Certifications couvertes : ${bool(company.certifications_covered)}
- Conférences couvertes : ${bool(company.conferences_covered)}

CLAUSES CONTRACTUELLES :
- Non-concurrence : ${pkg.non_compete_enabled ? `Oui — ${pkg.non_compete_months ?? "?"} mois, ${val(pkg.non_compete_compensation_pct)}% de compensation` : "Non"}
- Clause de mobilité : ${bool(pkg.mobility_clause)}

## DONNÉES MARCHÉ
${benchmarkBlock}

## SITUATION DU CANDIDAT
${candidateContext}

## RÈGLES DE COMPORTEMENT

1. Si une information est "non précisée" ou "non renseignée", dis-le clairement et suggère au candidat de demander directement à ${brand} via la messagerie.
2. Pour les questions fiscales (imposition BSPCE, AGA, PFU, calcul net...), explique les principes généraux de la fiscalité française des revenus d'equity et oriente vers le simulateur VEGA de Paqli si l'equity est renseignée. Ne donne jamais de conseil fiscal personnalisé.
3. Si une question dépasse les données disponibles (ambiance d'équipe, culture, projets en cours), dis honnêtement que tu ne peux pas répondre et encourage à poser la question lors de l'entretien.
4. Si une question concerne le marché salarial et que les données benchmark ne sont pas disponibles, tu peux mentionner les sources publiques connues (WTTJ, Externatic, études sectorielles) mais sans inventer de chiffre.
5. Réponses concises : 3-5 phrases maximum sauf si la question nécessite plus. Pas de listes à puces sauf si vraiment utile.
6. Ne jamais inventer un chiffre. Si tu n'as pas l'information, dis-le.
7. Tu n'es pas un conseiller juridique — pour les clauses contractuelles, tu expliques ce que dit le package et conseilles de consulter un juriste pour les implications légales.
8. Vouvoie toujours le candidat, avec chaleur et bienveillance.
9. Ne fais jamais de recommandation directe ("vous devriez accepter / refuser") — éclaire factuellement la décision.
`;
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        answer: null,
        error: { code: "GATEWAY_ERROR", message: "Configuration IA manquante." },
      };
    }

    // Étape 1 : valider le token et lire le compteur
    const { data: link, error: fetchError } = await supabaseAdmin
      .from("candidate_links")
      .select(
        "id, package_id, organization_id, candidate_name, expires_at, ai_questions_count, ai_questions_cap",
      )
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

    const rollback = async () => {
      await supabaseAdmin
        .from("candidate_links")
        .update({ ai_questions_count: currentCount })
        .eq("id", link.id);
    };

    // Étape 4 : charger le package (toutes colonnes) + company_profile + benchmark
    let pkgData: Record<string, any> = {};
    let companyData: Record<string, any> = {};
    let benchmarkData: Record<string, any> | null = null;

    if (link.package_id) {
      const { data: pkgRow } = await supabaseAdmin
        .from("packages")
        .select("*")
        .eq("id", link.package_id)
        .maybeSingle();
      if (pkgRow) {
        pkgData = pkgRow as Record<string, any>;
        benchmarkData = (pkgRow as any).benchmark_analysis ?? null;
      }
    }

    const { data: companyRow } = await supabaseAdmin
      .from("company_profile")
      .select("*")
      .eq("organization_id", link.organization_id)
      .maybeSingle();
    if (companyRow) companyData = companyRow as Record<string, any>;

    // Étape 5 : construire le prompt système Paq
    const system = buildPaqSystemPrompt({
      pkg: pkgData,
      company: companyData,
      orgName: data.orgName,
      candidateName: link.candidate_name,
      candidateContext: data.candidateContext,
      benchmark: benchmarkData,
    });

    // Étape 6 : appel Anthropic Claude
    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          system,
          messages: data.messages,
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

    if (res.status === 429 || res.status === 529) {
      await rollback();
      return {
        answer: null,
        error: {
          code: "GATEWAY_RATE_LIMITED",
          message:
            "L'assistant est surchargé. Réessayez dans quelques instants.",
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
      json?.content?.[0]?.text ?? "Désolé, aucune réponse générée.";

    // Persist Q&A so recruiters can review the candidate's AI conversation
    const lastUserMessage = [...data.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMessage) {
      await supabaseAdmin.from("ai_conversations").insert({
        link_id: link.id,
        question: lastUserMessage.content.slice(0, 4000),
        answer: answer.slice(0, 8000),
      });
    }

    return { answer, error: null };
  });
