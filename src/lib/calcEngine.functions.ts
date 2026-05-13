import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  token: z.string().min(4).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  tmi: z.number().min(0).max(0.5),
  seniorityYears: z.number().int().min(0).max(60),
  peeContribution: z.number().min(0).max(1_000_000).default(0),
});

type RulesMap = Record<string, number>;

function buildRulesMap(rules: Array<{ device_type: string; rule_key: string; value: number }>): RulesMap {
  const m: RulesMap = {};
  for (const r of rules) m[`${r.device_type}.${r.rule_key}`] = Number(r.value);
  return m;
}

function roundForDisplay(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value < 1000) return Math.round(value / 100) * 100;
  if (value < 10000) return Math.round(value / 500) * 500;
  if (value < 100000) return Math.round(value / 1000) * 1000;
  return Math.round(value / 5000) * 5000;
}

function computeEquity(
  devices: any[],
  scenarios: any[],
  seniorityYears: number,
  R: RulesMap,
) {
  const device = devices[0];
  if (!device || !scenarios.length) return [];
  const irRate =
    seniorityYears >= (R["bspce.seniority_threshold"] ?? 3)
      ? R["bspce.ir_rate_3y_plus"] ?? 0.128
      : R["bspce.ir_rate_under_3y"] ?? 0.30;
  const psRate = R["bspce.ps_rate"] ?? 0.186;
  const totalTax = irRate + psRate;

  return scenarios.map((scenario: any) => {
    let estimate = 0;
    if (device.strike_price > 0 && device.current_valuation_m > 0 && device.quantity > 0) {
      const totalShares = (device.current_valuation_m * 1_000_000) / device.strike_price;
      const exitPrice = (scenario.target_valuation_m * 1_000_000) / totalShares;
      const grossGain = (exitPrice - device.strike_price) * device.quantity;
      if (grossGain > 0) estimate = roundForDisplay(grossGain * (1 - totalTax));
    }
    return {
      label: scenario.label,
      estimate,
      tax_rate_applied: totalTax,
      target_valuation: scenario.target_valuation_m,
      horizon_years: scenario.horizon_years,
    };
  });
}

const DISCLAIMERS = [
  "Estimations indicatives arrondies — règles fiscales 2026.",
  "Ne constitue pas un conseil fiscal ou patrimonial.",
  "Les projections equity reposent sur des hypothèses de valorisation non garanties.",
  "Consultez un professionnel pour votre situation personnelle.",
];

export const calcEngine = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    // 1. Charger le link + package
    const { data: link, error: linkErr } = await supabaseAdmin
      .from("candidate_links")
      .select(
        `id, expires_at,
         packages (
           gross_salary, variable_target, benefits,
           scenario_display, scenario_message,
           equity_devices (*),
           savings_devices (*),
           scenarios (*)
         )`,
      )
      .eq("token", data.token)
      .maybeSingle();

    if (linkErr || !link || !link.packages) {
      throw new Response("Link not found", { status: 404 });
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      throw new Response("Link expired", { status: 410 });
    }

    const pkg: any = link.packages;

    // 2. Charger règles fiscales actives
    const { data: rules } = await supabaseAdmin
      .from("active_tax_rules")
      .select("device_type, rule_key, value");
    const R = buildRulesMap((rules ?? []) as any[]);

    // 3. Calculer
    const tmiFactor = 1 - 0.9 * data.tmi;
    const salaryEst = roundForDisplay(
      (pkg.gross_salary ?? 0) * (1 - 0.22) * tmiFactor,
    );
    const variableEst = roundForDisplay(
      (pkg.variable_target ?? 0) * (1 - 0.22) * tmiFactor,
    );

    const b = pkg.benefits ?? {};
    let benefitsTotal = 0;
    if (b.mutuelle) benefitsTotal += (b.mutuelleMontant ?? 0) * 12;
    if (b.ticketsResto) benefitsTotal += (b.ticketsRestoValeur ?? 0) * 218 * 0.6;
    if (b.vehicule) benefitsTotal += (b.vehiculeMontant ?? 0) * 12;
    if (b.formation) benefitsTotal += b.formationBudget ?? 0;
    const benefitsEst = roundForDisplay(benefitsTotal);

    const equityResults = computeEquity(
      pkg.equity_devices ?? [],
      pkg.scenarios ?? [],
      data.seniorityYears,
      R,
    );

    const peeDevice = pkg.savings_devices?.find((d: any) => d.type === "pee");
    const peeEst = peeDevice
      ? roundForDisplay(
          Math.min(
            data.peeContribution * (peeDevice.matching_rate ?? 0),
            peeDevice.cap_amount ?? 0,
            R["pee.matching_cap_amount"] ?? 3768,
          ),
        )
      : 0;

    const interDevice = pkg.savings_devices?.find((d: any) => d.type === "interessement");
    const interEst = interDevice?.avg_3y
      ? roundForDisplay(interDevice.avg_3y * (1 - (R["interessement.csg_crds"] ?? 0.097)))
      : 0;

    const partDevice = pkg.savings_devices?.find((d: any) => d.type === "participation");
    const partEst = partDevice?.avg_3y
      ? roundForDisplay(partDevice.avg_3y * (1 - (R["participation.csg_crds"] ?? 0.097)))
      : 0;

    const base = salaryEst + variableEst + benefitsEst + peeEst + interEst + partEst;
    const realisteEq = equityResults.find((s) => s.label === "realiste")?.estimate ?? 0;
    const pessEq = equityResults.find((s) => s.label === "pessimiste")?.estimate ?? 0;
    const optiEq = equityResults.find((s) => s.label === "optimiste")?.estimate ?? 0;

    const result = {
      salary_estimate: salaryEst,
      variable_estimate: variableEst,
      benefits_estimate: benefitsEst,
      pee_estimate: peeEst,
      interessement_estimate: interEst,
      participation_estimate: partEst,
      equity_by_scenario: equityResults,
      total_range: {
        low: roundForDisplay(base + (pessEq || realisteEq)),
        mid: roundForDisplay(base + realisteEq),
        high: roundForDisplay(base + (optiEq || realisteEq)),
      },
      disclaimers: DISCLAIMERS,
      computed_at: new Date().toISOString(),
    };

    // 4. Snapshot
    const { data: sim } = await supabaseAdmin
      .from("simulations")
      .upsert(
        {
          link_id: link.id,
          tmi: data.tmi,
          seniority_years: data.seniorityYears,
          pee_contribution: data.peeContribution,
          result_snapshot: result as any,
          tax_rules_version: "2026-01",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "link_id" },
      )
      .select("id")
      .single();

    return { success: true, result, simulationId: sim?.id ?? null };
  });
