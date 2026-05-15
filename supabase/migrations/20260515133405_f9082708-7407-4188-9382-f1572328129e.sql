
-- 1. Track AI profile generation
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS profile_generated_at TIMESTAMPTZ;

-- 2. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'validator';

-- 3. Competitors benchmark table
CREATE TABLE IF NOT EXISTS public.competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  notes TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  weaknesses TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view org competitors"
  ON public.competitors FOR SELECT TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "Admins insert competitors"
  ON public.competitors FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_user_org()
              AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "Admins update competitors"
  ON public.competitors FOR UPDATE TO authenticated
  USING (organization_id = current_user_org()
         AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "Admins delete competitors"
  ON public.competitors FOR DELETE TO authenticated
  USING (organization_id = current_user_org()
         AND has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE TRIGGER competitors_updated_at
  BEFORE UPDATE ON public.competitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_competitors_org ON public.competitors(organization_id);

-- 4. Allow admins to manage user roles in their org
CREATE POLICY "Admins insert org user roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "Admins delete org user roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "Admins view org user roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), organization_id, 'admin'::app_role));
