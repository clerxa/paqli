ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS attractiveness_score integer,
  ADD COLUMN IF NOT EXISTS attractiveness_computed timestamptz;