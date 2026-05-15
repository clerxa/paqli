ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS variable_config jsonb NOT NULL DEFAULT '{}'::jsonb;