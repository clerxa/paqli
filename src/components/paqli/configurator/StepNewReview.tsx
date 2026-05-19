import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { Step5Preview } from "./Step5Preview";

interface CP {
  meal_voucher_enabled: boolean | null;
  meal_voucher_daily_amount: number | null;
  meal_voucher_employer_rate: number | null;
  health_insurance_employer_rate: number | null;
  incentive_enabled: boolean | null;
  incentive_average_amount: number | null;
  profit_sharing_enabled: boolean | null;
  pee_enabled: boolean | null;
  perco_enabled: boolean | null;
  employer_match_rate: number | null;
}

function fmt(n: number) {
  if (n <= 0) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function fmtK(n: number) {
  if (n <= 0) return "—";
  return `${Math.round(n / 1000)} k€`;
}

export function StepNewReview() {
  const { config } = usePackageConfig();
  const [cp, setCp] = useState<CP | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("company_profile")
        .select(
          "meal_voucher_enabled,meal_voucher_daily_amount,meal_voucher_employer_rate,health_insurance_employer_rate,incentive_enabled,incentive_average_amount,profit_sharing_enabled,pee_enabled,perco_enabled,employer_match_rate",
        )
        .maybeSingle();
      if (data) setCp(data as CP);
    })();
  }, []);

  const fixed = config.fixedSalary || config.grossSalary || 0;
  const variable = config.variableEnabled ? config.variableTarget || 0 : 0;

  let trAnnual = 0;
  if (cp?.meal_voucher_enabled && cp.meal_voucher_daily_amount) {
    const rate = (cp.meal_voucher_employer_rate ?? 60) / 100;
    trAnnual = cp.meal_voucher_daily_amount * 218 * rate;
  }
  // Health insurance: rough estimate at 60€/mo, employer share
  let healthAnnual = 0;
  if (cp?.health_insurance_employer_rate) {
    healthAnnual = 60 * 12 * (cp.health_insurance_employer_rate / 100);
  }
  const incentive = cp?.incentive_enabled ? cp.incentive_average_amount ?? 0 : 0;
  // PEE matching rough estimate
  const peeMatch = cp?.pee_enabled && cp.employer_match_rate ? 1500 : 0;

  const total = fixed + variable + trAnnual + healthAnnual + incentive + peeMatch;

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="font-display text-aubergine"
          style={{ fontSize: 22 }}
        >
          Aperçu & validation
        </h2>
        <p className="text-[12px] text-grey mt-1">
          Récapitulatif tel que le verra le candidat.
        </p>
      </div>

      <div
        className="rounded-lg p-5"
        style={{ background: "#FAF8F5" }}
      >
        <div className="text-[12px] uppercase tracking-wide text-grey">
          Total Compensation estimé
        </div>
        <div
          className="font-display text-aubergine mt-1"
          style={{ fontSize: 36 }}
        >
          ~ {fmtK(total)}/an
        </div>
        <div className="mt-4 space-y-1.5 text-[13px] text-aubergine-light font-mono">
          <Row label="Fixe annuel" value={fmt(fixed)} />
          {variable > 0 && (
            <Row label="+ Variable cible" value={fmt(variable)} />
          )}
          {trAnnual > 0 && (
            <Row label="+ Tickets restaurant" value={`~ ${fmt(trAnnual)}/an`} />
          )}
          {healthAnnual > 0 && (
            <Row label="+ Mutuelle employeur" value={`~ ${fmt(healthAnnual)}/an`} />
          )}
          {incentive > 0 && (
            <Row label="+ Intéressement (moy.)" value={`~ ${fmt(incentive)}`} />
          )}
          {peeMatch > 0 && (
            <Row label="+ Abondement PEE" value={`~ ${fmt(peeMatch)}`} />
          )}
          <div
            className="border-t mt-2 pt-2 flex justify-between font-medium text-aubergine"
            style={{ borderColor: "rgba(45,38,64,0.12)" }}
          >
            <span>Total Compensation</span>
            <span>~ {fmt(total)}/an</span>
          </div>
        </div>
        {config.equityType && (
          <div className="mt-4 text-[12px] text-grey italic">
            Potentiel equity ({config.equityType.toUpperCase()}) — simulation
            VEGA disponible côté candidat.
          </div>
        )}
      </div>

      <div className="border-t border-[rgba(45,38,64,0.06)] pt-6">
        <Step5Preview />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
