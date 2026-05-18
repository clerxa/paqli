
-- 1. Table employee_testimonials
CREATE TABLE public.employee_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  job_title text NOT NULL,
  seniority_years integer,
  quote text NOT NULL,
  quote_context text,
  avatar_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_max_length CHECK (char_length(quote) <= 280)
);

ALTER TABLE public.employee_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH can manage own org testimonials"
  ON public.employee_testimonials
  FOR ALL
  TO authenticated
  USING (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE INDEX idx_testimonials_org_active
  ON public.employee_testimonials(organization_id, is_active, display_order);

CREATE TRIGGER update_employee_testimonials_updated_at
  BEFORE UPDATE ON public.employee_testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('testimonial-avatars', 'testimonial-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "RH can upload testimonial avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'testimonial-avatars');

CREATE POLICY "RH can update testimonial avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'testimonial-avatars');

CREATE POLICY "RH can delete testimonial avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'testimonial-avatars');

CREATE POLICY "Anyone can view testimonial avatars"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'testimonial-avatars');

-- 3. Enrich organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS employee_count text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS wtj_url text;
