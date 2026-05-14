-- Table jobs : offres d'emploi réutilisables
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',

  -- Identité
  job_summary TEXT,
  missions JSONB DEFAULT '[]'::jsonb,
  stack TEXT[],

  -- Type
  contract_type TEXT DEFAULT 'cdi',

  -- Flexibilité
  remote_policy TEXT DEFAULT 'hybrid',
  remote_days INTEGER,
  remote_guaranteed BOOLEAN DEFAULT false,
  flexible_hours BOOLEAN DEFAULT false,

  -- Localisation
  location_city TEXT,
  location_details TEXT,

  -- Équipe
  team_size INTEGER,
  team_description TEXT,
  manager_style TEXT,

  -- Culture
  company_values TEXT[],
  culture_note TEXT,
  glassdoor_url TEXT,
  wtj_url TEXT,

  -- Évolution
  growth_paths JSONB DEFAULT '[]'::jsonb,
  training_budget INTEGER,
  onboarding_note TEXT,

  -- Process
  process_steps JSONB DEFAULT '[]'::jsonb,
  process_duration TEXT,
  start_date TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_org ON public.jobs(organization_id);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH can view own org jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "RH can insert own org jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = current_user_org());

CREATE POLICY "RH can update own org jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "RH can delete own org jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (organization_id = current_user_org());

CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();