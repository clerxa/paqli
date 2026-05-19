ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS variable_uncapped boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS probation_renewable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS probation_renewal_max_months integer;