import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude } from "./claudeApi.server";
import { inferJobFamily, inferSeniority } from "./jobBenchmark";

// ─────────────────────────────────────────────────────────────────
// 1. Score d'attractivité
// ─────────────────────────────────────────────────────────────────

export interface AttractivenessResult {
  score: number;
  label: string;
  positives: string[];
  warnings: string[];
  suggestion: string;
  computed_at: string;
}

export const scoreAttractivenessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ packageId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: pkg, error } = await supabase
      .from("packages")
      .select(
        `id, title, gross_salary, variable_target, remote_policy, remote_days,
         company_values, training_budget,
         equity_devices (type, quantity, vesting_years, cliff_months),
         savings_devices (type, matching_rate, cap_amount, avg_3y)`,
      )
      .eq("id", data.packageId)
      .maybeSingle();

    if (error || !pkg) throw new Error("Package introuvable");

    // Fetch benchmark
    const family = inferJobFamily(pkg.title ?? "");
    const seniority = inferSeniority(pkg.title ?? "");
    const { data: bench } = await supabase
      .from("salary_benchmarks")
      .select("p25, p50, p75")
      .eq("job_family", family)
      .eq("seniority", seniority)
      .eq("location", "paris")
      .maybeSingle();

    const equity = (pkg.equity_devices ?? [])[0] ?? null;
    const pee =
      (pkg.savings_devices ?? []).find((d) => d.type === "pee") ?? null;
    const interess =
      (pkg.savings_devices ?? []).find((d) => d.type === "interessement") ??
      null;

    const systemPrompt = `Tu es un expert en rémunération et attractivité des offres d'emploi
dans les startups tech françaises. Tu analyses des packages de rémunération et produis
un diagnostic structuré.

RÈGLES ABSOLUES :
- Réponds uniquement en JSON valide
- Ne donne JAMAIS de conseil fiscal personnalisé
- Reste factuel et bienveillant
- Base-toi sur les benchmarks fournis, pas sur des suppositions
- Le score reflète l'attractivité globale, pas la valeur financière brute`;

    const userPrompt = `Analyse ce package de rémunération et produis un score d'attractivité.

PACKAGE :
${JSON.stringify(
  {
    poste: pkg.title,
    fixe_brut: pkg.gross_salary,
    variable: pkg.variable_target,
    remote_days: pkg.remote_days,
    remote_policy: pkg.remote_policy,
    equity,
    pee,
    interessement: interess,
    valeurs: pkg.company_values,
    formation_budget: pkg.training_budget,
    vesting_years: equity?.vesting_years ?? null,
  },
  null,
  2,
)}

BENCHMARKS MARCHÉ (Paris 2026) :
${JSON.stringify(bench ?? { note: "non disponible pour cette famille" }, null, 2)}

Produis un JSON avec exactement cette structure :
{
  "score": <nombre entre 0 et 100>,
  "label": "<'Peu attractif' si <40 | 'Correct' si 40-60 | 'Attractif' si 60-80 | 'Excellent' si >80>",
  "positives": ["<point fort 1, max 70 chars>", "<point fort 2>"],
  "warnings": ["<amélioration 1, max 70 chars>", "<amélioration 2>"],
  "suggestion": "<conseil principal en 1 phrase, max 120 chars>",
  "computed_at": "${new Date().toISOString()}"
}`;

    const raw = await callClaude({
      systemPrompt,
      userPrompt,
      maxTokens: 600,
      jsonMode: true,
    });

    const parsed = JSON.parse(raw) as AttractivenessResult;

    // Persist
    await supabase
      .from("packages")
      .update({
        attractiveness_score: Math.max(0, Math.min(100, Math.round(parsed.score))),
        attractiveness_computed: new Date().toISOString(),
      })
      .eq("id", data.packageId);

    return parsed;
  });

// ─────────────────────────────────────────────────────────────────
// 2. Rédaction message de relance
// ─────────────────────────────────────────────────────────────────

export const draftMessageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        linkId: z.string().uuid(),
        alertType: z
          .enum([
            "not_opened_48h",
            "opened_not_sim",
            "sim_no_response",
            "counter_offer",
            "general",
          ])
          .default("general"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: link } = await supabase
      .from("candidate_links")
      .select(
        `id, candidate_name, candidate_email, status, decline_category, decline_reason,
         packages (title),
         link_events (event_type, created_at)`,
      )
      .eq("id", data.linkId)
      .maybeSingle();

    if (!link) throw new Error("Lien introuvable");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, organizations(name)")
      .eq("id", context.userId)
      .maybeSingle();

    const events = ((link as any).link_events ?? [])
      .slice(-5)
      .map(
        (e: any) =>
          `${e.event_type} à ${new Date(e.created_at).toLocaleString("fr-FR")}`,
      )
      .join(", ");

    const situation =
      data.alertType === "not_opened_48h"
        ? "Le candidat n'a pas encore ouvert le lien d'offre envoyé il y a 48h"
        : data.alertType === "opened_not_sim"
          ? "Le candidat a ouvert le lien mais n'a pas lancé de simulation depuis 24h"
          : data.alertType === "sim_no_response"
            ? "Le candidat a simulé son package en détail mais n'a pas donné de réponse depuis 48h"
            : data.alertType === "counter_offer"
              ? `Le candidat a décliné pour "${(link as any).decline_category ?? "raison non précisée"}" — on lui envoie une contre-offre`
              : "Relance générale";

    const systemPrompt = `Tu es un assistant RH expert en recrutement de profils tech.
Tu rédiges des messages de relance professionnels, chaleureux et personnalisés.

RÈGLES ABSOLUES :
- Ton professionnel mais humain — jamais corporatif ni froid
- Court : 3 à 5 phrases maximum
- Toujours vouvoyer le candidat
- Ne jamais mentionner de montants financiers précis
- Ne jamais paraître désespéré ou pressant
- Signer avec le prénom du RH uniquement
- Ne jamais commencer par "J'espère que vous allez bien"`;

    const userPrompt = `Rédige un message de relance pour ce contexte :

${JSON.stringify(
  {
    candidat: link.candidate_name ?? "le candidat",
    rh: profile?.full_name ?? "L'équipe RH",
    entreprise: (profile as any)?.organizations?.name ?? "",
    poste: (link as any).packages?.title ?? "",
    situation,
    evenements_candidat: events,
    raison_refus: (link as any).decline_reason ?? null,
  },
  null,
  2,
)}

Rédige uniquement le corps du message — pas d'objet, pas de signature formelle.`;

    const message = await callClaude({
      systemPrompt,
      userPrompt,
      maxTokens: 300,
    });

    return { draft: message.trim() };
  });

// ─────────────────────────────────────────────────────────────────
// 3. Coach contextuel — analyse sémantique des valeurs
// ─────────────────────────────────────────────────────────────────

export const analyzeValuesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ values: z.array(z.string()).min(1).max(10) }).parse(input),
  )
  .handler(async ({ data }) => {
    const systemPrompt = `Tu es un expert en marque employeur. Tu analyses
des valeurs d'entreprise et donnes un conseil court en une phrase.
Réponds en JSON : {"level": "info|warning|success", "message": "..."}`;

    const raw = await callClaude({
      systemPrompt,
      userPrompt: `Ces valeurs sont-elles différenciantes et crédibles pour attirer des profils tech ? "${data.values.join(", ")}"`,
      maxTokens: 150,
      jsonMode: true,
    });

    const parsed = JSON.parse(raw) as {
      level: "info" | "warning" | "success";
      message: string;
    };
    return parsed;
  });

// ─────────────────────────────────────────────────────────────────
// 4. Génération fiche de poste
// ─────────────────────────────────────────────────────────────────

export const generateJobPostingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ packageId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: pkg, error } = await supabase
      .from("packages")
      .select(
        `*, equity_devices (type, quantity), savings_devices (type)`,
      )
      .eq("id", data.packageId)
      .maybeSingle();

    if (error || !pkg) throw new Error("Package introuvable");

    const equity =
      ((pkg as any).equity_devices ?? [])
        .map(
          (d: any) =>
            `${d.type.toUpperCase()} — ${Number(d.quantity).toLocaleString("fr-FR")} bons/titres`,
        )
        .join(", ") || null;

    const epargne =
      ((pkg as any).savings_devices ?? [])
        .map((d: any) => d.type.toUpperCase())
        .join(", ") || null;

    const systemPrompt = `Tu es un expert en recrutement tech et copywriting RH.
Tu rédiges des fiches de poste attractives, honnêtes et bien structurées
pour des startups et scale-ups françaises.

RÈGLES ABSOLUES :
- Jamais de jargon corporate ou de phrases creuses
- Honnête sur ce que le poste implique réellement
- Mettre en valeur les avantages différenciants
- Ton humain et direct — pas institutionnel
- Structure claire : Accroche → Missions → Profil → Package → Process
- Ne jamais inventer d'informations non fournies
- Ne jamais mentionner de montants nets ou d'estimations fiscales
- Longueur : 350 à 500 mots`;

    const userPrompt = `Génère une fiche de poste attractive pour cette offre.

DONNÉES :
${JSON.stringify(
  {
    titre: pkg.title,
    type_contrat: pkg.contract_type,
    accroche: pkg.job_summary,
    missions: pkg.missions,
    stack: pkg.stack,
    teletravail:
      pkg.remote_policy === "full_remote"
        ? "Full remote"
        : pkg.remote_policy === "hybrid"
          ? `Hybride — ${pkg.remote_days ?? 2}j/semaine`
          : "Présentiel",
    localisation: pkg.location_city,
    horaires_flexibles: pkg.flexible_hours,
    equipe: pkg.team_description,
    management: pkg.manager_style,
    valeurs: pkg.company_values,
    evolution: pkg.growth_paths,
    budget_formation: pkg.training_budget,
    onboarding: pkg.onboarding_note,
    fixe_brut: pkg.gross_salary,
    variable: pkg.variable_target,
    equity,
    epargne,
    process: pkg.process_steps,
    duree_process: pkg.process_duration,
    date_demarrage: pkg.start_date,
  },
  null,
  2,
)}

Utilise le format Markdown avec des titres clairs.
Ne mentionne que les informations fournies — ne complète pas avec des suppositions.`;

    const posting = await callClaude({
      systemPrompt,
      userPrompt,
      maxTokens: 1200,
    });

    return { posting };
  });

// Helper to fetch benchmark for a package title (used by coach)
export const getBenchmarkFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ title: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const family = inferJobFamily(data.title);
    const seniority = inferSeniority(data.title);
    const { data: bench } = await supabase
      .from("salary_benchmarks")
      .select("p25, p50, p75, job_family, seniority")
      .eq("job_family", family)
      .eq("seniority", seniority)
      .eq("location", "paris")
      .maybeSingle();
    return bench;
  });
