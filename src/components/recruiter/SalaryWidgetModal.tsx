import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SalaryWidget, type SalaryWidgetData } from "./SalaryWidget";

interface Props {
  packageId: string;
  onClose: () => void;
}

export function SalaryWidgetModal({ packageId, onClose }: Props) {
  const [data, setData] = useState<SalaryWidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pkgRes, cpRes] = await Promise.all([
        supabase
          .from("packages")
          .select(
            "job_title,seniority,location,fixed_salary,gross_salary,salary_range_min,salary_range_max,salary_negotiable,variable_enabled,variable_target,variable_max,variable_frequency,signing_bonus_amount,equity_type,remote_work_days_specific",
          )
          .eq("id", packageId)
          .maybeSingle(),
        supabase
          .from("company_profile")
          .select(
            "remote_work_policy,remote_work_days_per_week,meal_voucher_enabled,meal_voucher_daily_amount,meal_voucher_provider",
          )
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const p = (pkgRes.data ?? {}) as Record<string, unknown>;
      const c = (cpRes.data ?? {}) as Record<string, unknown>;
      setData({
        job_title: (p.job_title as string) ?? null,
        seniority: (p.seniority as string) ?? null,
        location: (p.location as string) ?? null,
        fixed_salary:
          (p.fixed_salary as number) ?? (p.gross_salary as number) ?? null,
        salary_range_min: (p.salary_range_min as number) ?? null,
        salary_range_max: (p.salary_range_max as number) ?? null,
        salary_negotiable: (p.salary_negotiable as boolean) ?? null,
        variable_enabled: (p.variable_enabled as boolean) ?? null,
        variable_target: (p.variable_target as number) ?? null,
        variable_max: (p.variable_max as number) ?? null,
        variable_frequency: (p.variable_frequency as string) ?? null,
        signing_bonus_amount: (p.signing_bonus_amount as number) ?? null,
        equity_type: (p.equity_type as string) ?? null,
        remote_work_policy: (c.remote_work_policy as string) ?? null,
        remote_work_days_per_week:
          (c.remote_work_days_per_week as number) ?? null,
        remote_work_days_specific:
          (p.remote_work_days_specific as number) ?? null,
        meal_voucher_enabled: (c.meal_voucher_enabled as boolean) ?? null,
        meal_voucher_daily_amount:
          (c.meal_voucher_daily_amount as number) ?? null,
        meal_voucher_provider: (c.meal_voucher_provider as string) ?? null,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [packageId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(45,38,64,0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end p-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-[#F0EBE8] text-aubergine-light"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pb-5">
          {loading || !data ? (
            <div className="text-center text-grey py-10 text-[13px]">
              Chargement…
            </div>
          ) : (
            <SalaryWidget pkg={data} />
          )}
        </div>
      </div>
    </div>
  );
}
