
ALTER TABLE public.candidate_links
  ADD COLUMN IF NOT EXISTS thinking_note text,
  ADD COLUMN IF NOT EXISTS thinking_at timestamptz;
