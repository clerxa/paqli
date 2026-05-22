import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePackageConfig } from "@/contexts/PackageConfigContext";
import { CandidatePreviewInline } from "./CandidatePreviewInline";
import { Step5Preview } from "./Step5Preview";
import { TransparencyMissingFields } from "@/components/recruiter/TransparencyMissingFields";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  TransparencyCompany,
  TransparencyPackage,
} from "@/lib/transparencyScore";

interface CP {
  meal_voucher_enabled: boolean | null;
  health_insurance_employer_rate: number | null;
  incentive_enabled: boolean | null;
  profit_sharing_enabled: boolean | null;
  remote_work_policy: string | null;
  training_budget_per_person: number | null;
}

export function StepNewReview() {
  const { config } = usePackageConfig();
  const { organization } = useAuth();
  const navigate = useNavigate();
  const [cp, setCp] = useState<CP | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("company_profile")
        .select(
          "meal_voucher_enabled,health_insurance_employer_rate,incentive_enabled,profit_sharing_enabled,remote_work_policy,training_budget_per_person",
        )
        .maybeSingle();
      if (data) setCp(data as CP);
    })();
  }, []);

  const transparencyPkg: TransparencyPackage = {
    fixed_salary: config.fixedSalary || config.grossSalary || null,
    salary_range_min: config.salaryRangeMin || null,
    salary_range_max: config.salaryRangeMax || null,
    variable_enabled: config.variableEnabled ?? null,
    variable_criteria: config.variableCriteria || null,
    equity_type: config.equityType || null,
    job_title: config.jobTitle || null,
    seniority: config.seniority || null,
    hiring_manager: config.hiringManager || null,
    team_description: config.teamDescription || null,
    career_path: config.careerPath || null,
    non_compete_enabled: config.nonCompeteEnabled ?? null,
    probation_months: config.probationMonths || null,
    probation_objectives: config.probationObjectives || null,
    training_budget_specific: config.trainingBudgetSpecific || null,
  };
  const transparencyCompany: TransparencyCompany = {
    health_insurance_employer_rate: cp?.health_insurance_employer_rate ?? null,
    meal_voucher_enabled: cp?.meal_voucher_enabled ?? null,
    remote_work_policy: cp?.remote_work_policy ?? null,
    profit_sharing_enabled: cp?.profit_sharing_enabled ?? null,
    incentive_enabled: cp?.incentive_enabled ?? null,
    training_budget_per_person: cp?.training_budget_per_person ?? null,
  };

  return (
    <div className="space-y-8">
      {/* 1. Intention claire */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-grey mb-1">
          Étape 5 sur 5
        </div>
        <h2 className="font-display text-aubergine" style={{ fontSize: 24 }}>
          Vérifiez, publiez, partagez
        </h2>
        <p className="text-[13px] text-grey mt-2 max-w-xl">
          Voici ce que verra exactement votre candidat. Si tout est bon,
          publiez le package et générez un lien personnalisé en bas de page.
        </p>
      </div>

      {/* 2. Aperçu WYSIWYG — la pièce maîtresse */}
      <CandidatePreviewInline config={config} organization={organization} />

      {/* 3. Champs à enrichir (optionnel, collapsible) */}
      <TransparencyMissingFields
        pkg={transparencyPkg}
        company={transparencyCompany}
        onGoToSettings={() => navigate({ to: "/settings" })}
      />

      {/* 4. Séparateur visuel + appel à l'action */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-[rgba(45,38,64,0.08)]" />
        <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-aubergine font-medium">
          Prêt ? <ArrowRight size={14} />
        </div>
        <div className="h-px flex-1 bg-[rgba(45,38,64,0.08)]" />
      </div>

      {/* 5. Publier + lien candidat */}
      <Step5Preview />
    </div>
  );
}
