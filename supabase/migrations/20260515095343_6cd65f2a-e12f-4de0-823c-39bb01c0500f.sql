-- Enrich organizations with legal info
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS address_city text;

-- Enrich packages with trial period
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS trial_period_months integer,
  ADD COLUMN IF NOT EXISTS trial_period_renewable boolean DEFAULT false;

-- Offer letters table
CREATE TABLE IF NOT EXISTS public.offer_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.candidate_links(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  package_id uuid NOT NULL REFERENCES public.packages(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH can manage own org offer letters"
  ON public.offer_letters FOR ALL
  TO authenticated
  USING (organization_id = current_user_org())
  WITH CHECK (organization_id = current_user_org());

CREATE INDEX IF NOT EXISTS idx_offer_letters_link ON public.offer_letters(link_id);
CREATE INDEX IF NOT EXISTS idx_offer_letters_org ON public.offer_letters(organization_id, created_at DESC);

CREATE TRIGGER offer_letters_updated_at
  BEFORE UPDATE ON public.offer_letters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for PDFs (private, signed URL access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-letters', 'offer-letters', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth can upload offer letters"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'offer-letters');

CREATE POLICY "Auth can read offer letters"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'offer-letters');

CREATE POLICY "Auth can update offer letters"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'offer-letters');