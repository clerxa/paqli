-- Catalogue d'avantages au niveau de l'organisation
CREATE TABLE public.org_benefit_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  benefit_key TEXT NOT NULL,
  category TEXT NOT NULL,
  custom_label TEXT,
  value_type TEXT NOT NULL DEFAULT 'fixed',
  monthly_value NUMERIC,
  annual_value NUMERIC,
  employer_share NUMERIC,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_benefit_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view org benefit catalog"
  ON public.org_benefit_catalog FOR SELECT TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "Admins insert org benefit catalog"
  ON public.org_benefit_catalog FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_user_org() AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "Admins update org benefit catalog"
  ON public.org_benefit_catalog FOR UPDATE TO authenticated
  USING (organization_id = current_user_org() AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "Admins delete org benefit catalog"
  ON public.org_benefit_catalog FOR DELETE TO authenticated
  USING (organization_id = current_user_org() AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE TRIGGER trg_org_benefit_catalog_updated
  BEFORE UPDATE ON public.org_benefit_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_org_benefit_catalog_org ON public.org_benefit_catalog(organization_id, display_order);

-- Catalogue d'equity au niveau de l'organisation
CREATE TABLE public.org_equity_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  type TEXT NOT NULL,
  vesting_years INTEGER NOT NULL DEFAULT 4,
  cliff_months INTEGER NOT NULL DEFAULT 6,
  default_strike_price NUMERIC NOT NULL DEFAULT 0,
  default_valuation_m NUMERIC NOT NULL DEFAULT 0,
  special_conditions TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_equity_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view org equity catalog"
  ON public.org_equity_catalog FOR SELECT TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "Admins insert org equity catalog"
  ON public.org_equity_catalog FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_user_org() AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "Admins update org equity catalog"
  ON public.org_equity_catalog FOR UPDATE TO authenticated
  USING (organization_id = current_user_org() AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "Admins delete org equity catalog"
  ON public.org_equity_catalog FOR DELETE TO authenticated
  USING (organization_id = current_user_org() AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE TRIGGER trg_org_equity_catalog_updated
  BEFORE UPDATE ON public.org_equity_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_org_equity_catalog_org ON public.org_equity_catalog(organization_id, display_order);

-- Catalogue d'épargne salariale au niveau de l'organisation
CREATE TABLE public.org_savings_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  type TEXT NOT NULL,
  default_matching_rate NUMERIC DEFAULT 0,
  default_cap_amount NUMERIC DEFAULT 0,
  default_avg_3y NUMERIC,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_savings_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view org savings catalog"
  ON public.org_savings_catalog FOR SELECT TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "Admins insert org savings catalog"
  ON public.org_savings_catalog FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_user_org() AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "Admins update org savings catalog"
  ON public.org_savings_catalog FOR UPDATE TO authenticated
  USING (organization_id = current_user_org() AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "Admins delete org savings catalog"
  ON public.org_savings_catalog FOR DELETE TO authenticated
  USING (organization_id = current_user_org() AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE TRIGGER trg_org_savings_catalog_updated
  BEFORE UPDATE ON public.org_savings_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_org_savings_catalog_org ON public.org_savings_catalog(organization_id, display_order);