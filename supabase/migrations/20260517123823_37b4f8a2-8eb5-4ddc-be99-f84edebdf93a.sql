ALTER TABLE public.candidate_links
  ADD COLUMN IF NOT EXISTS candidate_current_package jsonb,
  ADD COLUMN IF NOT EXISTS candidate_current_package_at timestamp with time zone;