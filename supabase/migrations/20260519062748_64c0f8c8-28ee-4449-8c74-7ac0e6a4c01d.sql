
CREATE TABLE IF NOT EXISTS public.company_profile (
  id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id           uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  legal_name                text,
  brand_name                text,
  website                   text,
  size_range                text,
  industry                  text,
  founding_year             integer,
  stage                     text,
  description               text,

  collective_agreement      text,
  working_time_regime       text,
  weekly_hours              integer DEFAULT 35,

  health_insurance_provider text,
  health_insurance_employer_rate integer,
  health_insurance_level    text,
  health_insurance_family   boolean DEFAULT false,

  provident_fund_enabled    boolean DEFAULT false,
  provident_fund_details    text,

  meal_voucher_enabled      boolean DEFAULT false,
  meal_voucher_daily_amount integer,
  meal_voucher_employer_rate integer,
  meal_voucher_provider     text,

  transport_reimbursement_rate integer DEFAULT 50,
  mobility_package_amount   integer,
  company_car_policy        text,

  remote_work_days_per_week integer DEFAULT 0,
  remote_work_policy        text,
  remote_work_equipment     jsonb,

  rtt_days_per_year         integer DEFAULT 0,
  extra_leave_seniority     boolean DEFAULT false,
  extra_leave_details       text,
  family_events_leave       text,
  bonus_days_off            text,

  works_council_enabled     boolean DEFAULT false,
  works_council_benefits    text,
  holiday_vouchers_amount   integer,
  culture_vouchers_amount   integer,

  profit_sharing_enabled    boolean DEFAULT false,
  incentive_enabled         boolean DEFAULT false,
  incentive_average_amount  integer,
  pee_enabled               boolean DEFAULT false,
  perco_enabled             boolean DEFAULT false,
  employer_match_rate       integer,
  mandatory_per_enabled     boolean DEFAULT false,
  mandatory_per_details     text,

  salary_review_frequency   text,
  salary_review_criteria    text,
  salary_freeze_months      integer DEFAULT 0,

  referral_bonus_amount     integer,
  referral_program_enabled  boolean DEFAULT false,

  training_budget_per_person integer,
  training_policy           text,
  certifications_covered    boolean DEFAULT false,
  conferences_covered       boolean DEFAULT false,

  completion_score          integer DEFAULT 0,
  updated_at                timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS company_profile_org_unique
  ON public.company_profile(organization_id);

ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view org company profile"
  ON public.company_profile FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "Admins insert org company profile"
  ON public.company_profile FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_org()
    AND public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  );

CREATE POLICY "Admins update org company profile"
  ON public.company_profile FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.current_user_org()
    AND public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  );

CREATE POLICY "Admins delete org company profile"
  ON public.company_profile FOR DELETE
  TO authenticated
  USING (
    organization_id = public.current_user_org()
    AND public.has_role(auth.uid(), organization_id, 'admin'::app_role)
  );

CREATE TRIGGER company_profile_set_updated_at
  BEFORE UPDATE ON public.company_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
