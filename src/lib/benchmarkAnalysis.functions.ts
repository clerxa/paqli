import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude } from "./claudeApi.server";
import { inferJobFamily, inferSeniority } from "./jobBenchmark";

export interface BenchmarkAnalysis {
  status: "found" | "web_fallback" | "unavailable";
  source: string;
  job_family: string;
  seniority: string;
  location: string;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  proposed_salary: number;
  positioning: "below" | "within" | "above";
  positioning_label: string;
  gap_percent: number;
  ai_analysis: string;
  analyzed_at: string;
}

const TokenSchema = z.object({
  token: z.string().min(4).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});

const PackageIdSchema = z.object({
  packageId: z.string().uuid(),
});

const FAMILY_LABEL: Record<string, string> = {
  software_engineer: "Software Engineer",
  frontend_engineer: "Frontend Engineer",
  backend_engineer: "Backend Engineer",
  data_scientist: "Data Scientist",
  data_engineer: "Data Engineer",
  product_manager: "Product Manager",
  designer: "Product Designer",
  devops_engineer: "DevOps / SRE",
  engineering_manager: "Engineering Manager",
  sales: "Sales",
  marketing: "Marketing",
  other: "Profil",
};

const SENIORITY_LABEL: Record<string, string> = {
  junior: "Junior",
  mid: "Confirmé",
  senior: "Senior",
  staff: "Staff",
  lead: "Lead",
};

async function callClaudeWithWebSearch(params: {
  userPrompt: string;
  systemPrompt: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: params.maxTokens ?? 1200,
        system: params.systemPrompt,
        messages: [{ role: "user", content: params.userPrompt }],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 3,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Anthropic ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    return (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("\n")
      .trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function computeBenchmarkForPackage(packageId: string): Promise<BenchmarkAnalysis | null> {
  const { data: pkg } = await supabaseAdmin
    .from("packages")
    .select("id, title, gross_salary, location_city")
    .eq("id", packageId)
    .maybeSingle();

  if (!pkg) return null;
  const fixedSalary = Number(pkg.gross_salary) || 0;
  if (fixedSalary <= 0) return null;

  const title = pkg.title || "";
  const jobFamily = inferJobFamily(title);
  const seniority = inferSeniority(title);
  const locationRaw = (pkg.location_city || "Paris").trim();
  const locationKey = locationRaw.toLowerCase();

  let benchmarkRow:
    | {
        p25: number;
        p50: number;
        p75: number;
        source: string | null;
        version: string;
        job_family: string;
        seniority: string;
        location: string;
      }
    | null = null;

  if (jobFamily !== "other") {
    const { data: exact } = await supabaseAdmin
      .from("salary_benchmarks")
      .select("p25, p50, p75, source, version, job_family, seniority, location")
      .eq("job_family", jobFamily)
      .eq("seniority", seniority)
      .eq("location", locationKey)
      .maybeSingle();

    if (exact) {
      benchmarkRow = {
        ...exact,
        p25: Number(exact.p25),
        p50: Number(exact.p50),
        p75: Number(exact.p75),
      };
    } else {
      const { data: fallbackParis } = await supabaseAdmin
        .from("salary_benchmarks")
        .select(
          "p25, p50, p75, source, version, job_family, seniority, location",
        )
        .eq("job_family", jobFamily)
        .eq("seniority", seniority)
        .eq("location", "paris")
        .maybeSingle();

      if (fallbackParis) {
        benchmarkRow = {
          ...fallbackParis,
          p25: Number(fallbackParis.p25),
          p50: Number(fallbackParis.p50),
          p75: Number(fallbackParis.p75),
        };
      }
    }
  }

  let analysis: BenchmarkAnalysis;

  if (benchmarkRow) {
    const gap = benchmarkRow.p50
      ? Math.round(((fixedSalary - benchmarkRow.p50) / benchmarkRow.p50) * 100)
      : 0;
    const positioning: BenchmarkAnalysis["positioning"] =
      fixedSalary < benchmarkRow.p25
        ? "below"
        : fixedSalary > benchmarkRow.p75
          ? "above"
          : "within";

    const userPrompt = `Package à analyser :
- Poste : ${title}
- Niveau : ${SENIORITY_LABEL[benchmarkRow.seniority] ?? benchmarkRow.seniority}
- Ville : ${locationRaw}
- Salaire fixe proposé : ${Math.round(fixedSalary / 1000)}k€

Données marché (${benchmarkRow.source ?? "benchmark interne"} ${benchmarkRow.version}) :
- P25 : ${Math.round(benchmarkRow.p25 / 1000)}k€
- Médiane (P50) : ${Math.round(benchmarkRow.p50 / 1000)}k€
- P75 : ${Math.round(benchmarkRow.p75 / 1000)}k€
- Écart vs médiane : ${gap > 0 ? "+" : ""}${gap}%

Rédige une analyse concise de 2-3 phrases maximum pour le candidat tech qui reçoit ce package. Sois direct, factuel, sans jargon RH. Mentionne si l'offre est compétitive dans le contexte 2026 (marché en stabilisation, stretchflation, seniorisation). Réponds UNIQUEMENT avec le texte de l'analyse, sans introduction ni titre.`;

    const text = await callClaude({
      systemPrompt:
        "Tu es un expert RH spécialisé dans les rémunérations tech en France.",
      userPrompt,
      caller: "benchmarkAnalysis",
      maxTokens: 500,
    });

    analysis = {
      status: "found",
      source: `${benchmarkRow.source ?? "Benchmark interne"} · ${benchmarkRow.version}`,
      job_family:
        FAMILY_LABEL[benchmarkRow.job_family] ?? benchmarkRow.job_family,
      seniority:
        SENIORITY_LABEL[benchmarkRow.seniority] ?? benchmarkRow.seniority,
      location: locationRaw,
      p25: benchmarkRow.p25,
      p50: benchmarkRow.p50,
      p75: benchmarkRow.p75,
      proposed_salary: fixedSalary,
      positioning,
      positioning_label:
        positioning === "below"
          ? "En dessous du marché"
          : positioning === "above"
            ? "Au-dessus du marché"
            : "Dans la fourchette marché",
      gap_percent: gap,
      ai_analysis: text,
      analyzed_at: new Date().toISOString(),
    };
  } else {
    const userPrompt = `Un package vient d'être configuré pour ce profil :
- Poste : ${title || "Non précisé"}
- Ville : ${locationRaw}
- Salaire fixe proposé : ${Math.round(fixedSalary / 1000)}k€

Ce profil n'est pas référencé dans notre base de benchmarks. Utilise web_search pour trouver des données salariales récentes (2025-2026) pour ce poste en France sur Welcome to the Jungle, LinkedIn Jobs, ou des études de cabinets de recrutement.

Retourne UNIQUEMENT un objet JSON valide (sans markdown, sans texte avant ou après) avec cette structure exacte :
{
  "p25": <nombre en euros annuels ou null>,
  "p50": <nombre en euros annuels ou null>,
  "p75": <nombre en euros annuels ou null>,
  "source": "<nom des sources principales trouvées>",
  "positioning": "<below|within|above>",
  "positioning_label": "<En dessous du marché|Dans la fourchette marché|Au-dessus du marché>",
  "gap_percent": <entier, négatif si en dessous de la médiane>,
  "ai_analysis": "<2-3 phrases d'analyse pour le candidat>"
}`;

    const raw = await callClaudeWithWebSearch({
      systemPrompt:
        "Tu es un expert RH spécialisé dans les rémunérations tech en France. Tu utilises web_search pour fonder ton analyse sur des données réelles et récentes.",
      userPrompt,
    });

    const clean = raw.replace(/```json|```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as {
          p25: number | null;
          p50: number | null;
          p75: number | null;
          source?: string;
          positioning?: BenchmarkAnalysis["positioning"];
          positioning_label?: string;
          gap_percent?: number;
          ai_analysis?: string;
        })
      : null;

    if (!parsed) {
      analysis = {
        status: "unavailable",
        source: "",
        job_family: FAMILY_LABEL[jobFamily] ?? title,
        seniority: SENIORITY_LABEL[seniority] ?? seniority,
        location: locationRaw,
        p25: null,
        p50: null,
        p75: null,
        proposed_salary: fixedSalary,
        positioning: "within",
        positioning_label: "Données insuffisantes",
        gap_percent: 0,
        ai_analysis: raw.slice(0, 400),
        analyzed_at: new Date().toISOString(),
      };
    } else {
      analysis = {
        status: "web_fallback",
        source: parsed.source || "Recherche web temps réel",
        job_family: FAMILY_LABEL[jobFamily] ?? title,
        seniority: SENIORITY_LABEL[seniority] ?? seniority,
        location: locationRaw,
        p25: parsed.p25 ?? null,
        p50: parsed.p50 ?? null,
        p75: parsed.p75 ?? null,
        proposed_salary: fixedSalary,
        positioning: parsed.positioning ?? "within",
        positioning_label:
          parsed.positioning_label ?? "Dans la fourchette marché",
        gap_percent: parsed.gap_percent ?? 0,
        ai_analysis: parsed.ai_analysis ?? "",
        analyzed_at: new Date().toISOString(),
      };
    }
  }

  await supabaseAdmin
    .from("packages")
    .update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      benchmark_analysis: analysis as any,
      benchmark_analyzed_at: new Date().toISOString(),
    })
    .eq("id", packageId);

  return analysis;
}

/**
 * Public read-only: candidate side fetches the cached analysis via its token.
 * Returns null if employer hasn't generated it yet.
 */
export const getBenchmarkAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TokenSchema.parse(input))
  .handler(async ({ data }): Promise<BenchmarkAnalysis | null> => {
    const { data: link } = await supabaseAdmin
      .from("candidate_links")
      .select("package_id")
      .eq("token", data.token)
      .maybeSingle();

    if (!link?.package_id) return null;

    const { data: pkg } = await supabaseAdmin
      .from("packages")
      .select("benchmark_analysis")
      .eq("id", link.package_id)
      .maybeSingle();

    if (!pkg?.benchmark_analysis) return null;
    return pkg.benchmark_analysis as unknown as BenchmarkAnalysis;
  });

/**
 * Employer-side: generates (or regenerates) the benchmark analysis and persists
 * it on the package. Authenticated; package must belong to the user's org.
 */
export const generatePackageBenchmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PackageIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<BenchmarkAnalysis | null> => {
    const { supabase } = context;

    // RLS enforces org membership
    const { data: pkg, error } = await supabase
      .from("packages")
      .select("id")
      .eq("id", data.packageId)
      .maybeSingle();

    if (error || !pkg) {
      throw new Error("Package introuvable ou accès refusé");
    }

    try {
      return await computeBenchmarkForPackage(data.packageId);
    } catch (err) {
      console.error("[generatePackageBenchmark] échec:", err);
      throw new Error(
        err instanceof Error ? err.message : "Échec de la génération",
      );
    }
  });
