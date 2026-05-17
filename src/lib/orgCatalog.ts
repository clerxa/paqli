import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { EquityType, SavingsType } from "@/lib/packageConfig";
import type { BenefitCategory, ValueType } from "@/lib/benefitCatalog";

export interface OrgBenefitCatalogItem {
  id: string;
  benefit_key: string;
  category: BenefitCategory;
  custom_label: string | null;
  value_type: ValueType;
  monthly_value: number | null;
  annual_value: number | null;
  employer_share: number | null;
  display_order: number;
}

export interface OrgEquityCatalogItem {
  id: string;
  type: EquityType;
  vesting_years: number;
  cliff_months: number;
  default_strike_price: number;
  default_valuation_m: number;
  special_conditions: string | null;
  display_order: number;
}

export interface OrgSavingsCatalogItem {
  id: string;
  type: SavingsType;
  default_matching_rate: number | null;
  default_cap_amount: number | null;
  default_avg_3y: number | null;
  display_order: number;
}

export function useOrgCatalogs() {
  const { organization } = useAuth();
  const [benefits, setBenefits] = useState<OrgBenefitCatalogItem[]>([]);
  const [equity, setEquity] = useState<OrgEquityCatalogItem[]>([]);
  const [savings, setSavings] = useState<OrgSavingsCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const [b, e, s] = await Promise.all([
      supabase
        .from("org_benefit_catalog")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order"),
      supabase
        .from("org_equity_catalog")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order"),
      supabase
        .from("org_savings_catalog")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order"),
    ]);
    setBenefits((b.data ?? []) as OrgBenefitCatalogItem[]);
    setEquity((e.data ?? []) as OrgEquityCatalogItem[]);
    setSavings((s.data ?? []) as OrgSavingsCatalogItem[]);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { benefits, equity, savings, loading, refresh };
}
