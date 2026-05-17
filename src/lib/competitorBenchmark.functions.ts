import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callClaude } from "./claudeApi.server";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface BenchmarkCriterion {
  name: string;
  weight: number; // 0..1
  scores: { company: string; score: number; note: string }[];
  insight: string;
}

export interface CompetitorArgument {
  competitor: string;
  argument: string;
}

export interface BenchmarkContent {
  company: string;
  axes: string[]; // 3 critères différenciants choisis
  criteria: BenchmarkCriterion[];
  synthesis: string;
  competitor_arguments: CompetitorArgument[];
  watchpoints: { criterion: string; framing: string }[];
  ideal_candidate: string;
  generated_for_role?: string;
}

export interface PackageBenchmarkRow {
  package_id: string;
  organization_id: string;
  content: BenchmarkContent;
  model: string | null;
  prompt_version: string | null;
  generated_at: string;
}

const SYSTEM_PROMPT = `Tu es un consultant en marque employeur indépendant. Tu as analysé le marché pour un candidat qui hésite entre plusieurs entreprises. Ton analyse est objective dans la méthode mais elle part des données réelles de l'entreprise pour construire le cadre de comparaison le plus favorable à sa valorisation — sans distorsion factuelle.

Contraintes de ton :
- Factuel : aucune donnée inventée. Si une info manque pour un concurrent, écris "[Donnée non publique]" dans le note correspondant.
- Orienté sans être partial : critères et pondérations favorisent l'entreprise analysée, mais chaque affirmation doit rester défendable face à un candidat qui a fait ses recherches.
- Jamais de superlatifs vides. Toujours un fait derrière l'argument.
- Faiblesses admises mais replacées, jamais effacées.
- Le lecteur doit sentir qu'il lit une analyse, pas une brochure RH.

Tu produis 6 livrables :
1. axes : 3 critères sur lesquels l'entreprise dispose d'un avantage réel (formulés du point de vue du candidat).
2. criteria : tableau de 5 critères = les 3 axes ci-dessus + 2 critères neutres incontournables ("Rémunération globale", "Évolution de carrière"). Pour chaque critère : note /5 par entreprise (toutes les entreprises listées), une phrase factuelle justifiant la note, une pondération (la somme = 1, les axes favorables pèsent davantage mais resté défendable). Inclure un "insight" : constat clé du critère.
3. synthesis : 6 à 8 lignes — reconnaît la compétitivité du marché, identifie ce qui rend l'entreprise distinctive pour ce profil, conclut sur le rapport global favorable sans slogan.
4. competitor_arguments : pour chaque concurrent, un argument factuel ciblé. Format de la phrase : "Face à X, ce qui change concrètement : ...".
5. watchpoints : pour chaque critère où l'entreprise est en retrait, une formulation honnête qui reconnaît l'écart et le replace.
6. ideal_candidate : 3-4 lignes sur le profil pour qui cette entreprise est le meilleur choix.`;

const ResponseSchema = z.object({
  axes: z.array(z.string()).min(1),
  criteria: z.array(
    z.object({
      name: z.string(),
      weight: z.number(),
      scores: z.array(
        z.object({
          company: z.string(),
          score: z.number(),
          note: z.string(),
        }),
      ),
      insight: z.string(),
    }),
  ),
  synthesis: z.string(),
  competitor_arguments: z.array(
    z.object({ competitor: z.string(), argument: z.string() }),
  ),
  watchpoints: z.array(
    z.object({ criterion: z.string(), framing: z.string() }),
  ),
  ideal_candidate: z.string(),
});

function fmtSalaryRange(min: number | null, max: number | null) {
  if (!min && !max) return "[Donnée manquante]";
  if (min && max) return `${min}–${max} k€`;
  return `${min ?? max} k€`;
}

// ─────────────────────────────────────────────────────────────────
// Generate benchmark for a package
// ─────────────────────────────────────────────────────────────────

export const generatePackageBenchmarkFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ packageId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fetch package + org + competitors
    const { data: pkg, error } = await supabase
      .from("packages")
      .select(
        `id, title, organization_id, gross_salary, variable_target,
         remote_policy, remote_days, training_budget, company_values, culture_note,
         growth_paths, manager_style, team_description, team_size,
         organizations ( name, description, key_figures, values, culture_note ),
         equity_devices ( type, quantity, vesting_years, cliff_months ),
         savings_devices ( type, matching_rate, cap_amount )`,
      )
      .eq("id", data.packageId)
      .maybeSingle();

    if (error || !pkg) throw new Error("Package introuvable");

    const organizationId = pkg.organization_id as string;
    const orgName =
      ((pkg.organizations as any)?.name as string) ?? "L'entreprise";

    const { data: competitors } = await supabase
      .from("competitors")
      .select("name, website, salary_min, salary_max, strengths, weaknesses, notes")
      .eq("organization_id", organizationId);

    if (!competitors || competitors.length === 0) {
      throw new Error(
        "Aucun concurrent renseigné. Ajoute au moins un concurrent dans Paramètres > Benchmark.",
      );
    }

    const equity = (pkg.equity_devices ?? [])[0] as any;
    const pee =
      ((pkg.savings_devices ?? []) as any[]).find((d) => d.type === "pee") ??
      null;

    const userPrompt = `## CONTEXTE
Entreprise analysée : ${orgName}
Poste : ${pkg.title ?? "[Donnée manquante]"}
Concurrents à comparer : ${competitors.map((c) => c.name).join(", ")}

## DONNÉES — ${orgName}
- Description : ${(pkg.organizations as any)?.description ?? "[Donnée manquante]"}
- Valeurs / culture : ${[...(((pkg.organizations as any)?.values as string[]) ?? []), ...(pkg.company_values ?? [])].join(", ") || "[Donnée manquante]"}
- Note culture : ${(pkg.organizations as any)?.culture_note ?? pkg.culture_note ?? "[Donnée manquante]"}
- Rémunération fixe : ${pkg.gross_salary ? `${pkg.gross_salary} €/an` : "[Donnée manquante]"}
- Variable cible : ${pkg.variable_target ? `${pkg.variable_target} €` : "Aucun"}
- Equity : ${equity ? `${equity.type} — ${equity.quantity ?? "?"} unités, vesting ${equity.vesting_years ?? "?"} ans, cliff ${equity.cliff_months ?? "?"} mois` : "Aucune"}
- PEE : ${pee ? `abondement ${pee.matching_rate ?? "?"}%, plafond ${pee.cap_amount ?? "?"} €` : "Aucun"}
- Remote : ${pkg.remote_policy ?? "[Donnée manquante]"}${pkg.remote_days ? ` (${pkg.remote_days}j/sem)` : ""}
- Budget formation : ${pkg.training_budget ? `${pkg.training_budget} €/an` : "[Donnée manquante]"}
- Évolution / mobilité : ${(pkg.growth_paths as string[])?.join(", ") || "[Donnée manquante]"}
- Style management : ${pkg.manager_style ?? "[Donnée manquante]"}
- Équipe : ${pkg.team_description ?? "[Donnée manquante]"}${pkg.team_size ? ` (${pkg.team_size} pers.)` : ""}

## DONNÉES — Concurrents
${competitors
  .map(
    (c) => `### ${c.name}
- Site : ${c.website ?? "[Donnée manquante]"}
- Fourchette salariale connue : ${fmtSalaryRange(c.salary_min as any, c.salary_max as any)}
- Forces identifiées : ${(c.strengths ?? []).join(", ") || "[Donnée manquante]"}
- Faiblesses identifiées : ${(c.weaknesses ?? []).join(", ") || "[Donnée manquante]"}
- Notes : ${c.notes ?? "[Donnée manquante]"}`,
  )
  .join("\n\n")}

## SORTIE ATTENDUE (JSON STRICT)
{
  "axes": ["axe1", "axe2", "axe3"],
  "criteria": [
    {
      "name": "Nom du critère",
      "weight": 0.25,
      "scores": [
        { "company": "${orgName}", "score": 4, "note": "Phrase factuelle." },
        ${competitors.map((c) => `{ "company": "${c.name}", "score": 3, "note": "Phrase factuelle." }`).join(",\n        ")}
      ],
      "insight": "Constat clé en 1 phrase."
    }
  ],
  "synthesis": "Texte 6-8 lignes.",
  "competitor_arguments": [
    ${competitors.map((c) => `{ "competitor": "${c.name}", "argument": "Face à ${c.name}, ce qui change concrètement : ..." }`).join(",\n    ")}
  ],
  "watchpoints": [
    { "criterion": "Nom critère", "framing": "Formulation honnête." }
  ],
  "ideal_candidate": "3-4 lignes."
}

La somme des "weight" doit faire 1. Les 3 axes de différenciation doivent peser ensemble plus que les 2 critères neutres.`;

    const raw = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 4000,
      jsonMode: true,
      caller: "competitorBenchmark",
      promptName: "competitorBenchmark",
      organizationId,
    });

    let parsed: z.infer<typeof ResponseSchema>;
    try {
      parsed = ResponseSchema.parse(JSON.parse(raw));
    } catch (e) {
      console.error("[competitorBenchmark] JSON parse failed:", raw.slice(0, 500));
      throw new Error("Réponse IA invalide. Réessaie dans un instant.");
    }

    const content: BenchmarkContent = {
      company: orgName,
      axes: parsed.axes,
      criteria: parsed.criteria,
      synthesis: parsed.synthesis,
      competitor_arguments: parsed.competitor_arguments,
      watchpoints: parsed.watchpoints,
      ideal_candidate: parsed.ideal_candidate,
      generated_for_role: pkg.title ?? undefined,
    };

    const { error: upsertError } = await supabaseAdmin
      .from("package_benchmarks")
      .upsert({
        package_id: data.packageId,
        organization_id: organizationId,
        content: content as any,
        model: "claude-haiku-4-5",
        prompt_version: "v1",
        generated_at: new Date().toISOString(),
        generated_by: userId,
      });

    if (upsertError) {
      console.error("[competitorBenchmark] upsert failed:", upsertError);
      throw new Error("Impossible d'enregistrer le benchmark.");
    }

    return { content, generated_at: new Date().toISOString() };
  });

// ─────────────────────────────────────────────────────────────────
// Get cached benchmark for a package (admin/recruiter side)
// ─────────────────────────────────────────────────────────────────

export const getPackageBenchmarkFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ packageId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("package_benchmarks")
      .select("content, generated_at, model")
      .eq("package_id", data.packageId)
      .maybeSingle();

    if (!row) return { exists: false as const };
    return {
      exists: true as const,
      content: row.content as unknown as BenchmarkContent,
      generated_at: row.generated_at as string,
      model: row.model as string | null,
    };
  });
