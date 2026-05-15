CREATE TABLE public.package_benchmarks (
  package_id uuid PRIMARY KEY REFERENCES public.packages(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  model text,
  prompt_version text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid
);

CREATE INDEX idx_package_benchmarks_org ON public.package_benchmarks(organization_id);

ALTER TABLE public.package_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view org package benchmarks"
  ON public.package_benchmarks FOR SELECT
  TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "Members insert org package benchmarks"
  ON public.package_benchmarks FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = current_user_org());

CREATE POLICY "Members update org package benchmarks"
  ON public.package_benchmarks FOR UPDATE
  TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "Members delete org package benchmarks"
  ON public.package_benchmarks FOR DELETE
  TO authenticated
  USING (organization_id = current_user_org());