ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS key_figures jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS values text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS culture_note text,
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_urls text[] NOT NULL DEFAULT '{}'::text[];