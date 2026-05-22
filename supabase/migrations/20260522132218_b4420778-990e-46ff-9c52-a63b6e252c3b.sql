ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_scenario_pessimistic_m numeric DEFAULT 80,
  ADD COLUMN IF NOT EXISTS default_scenario_realistic_m numeric DEFAULT 200,
  ADD COLUMN IF NOT EXISTS default_scenario_optimistic_m numeric DEFAULT 500,
  ADD COLUMN IF NOT EXISTS default_scenario_pessimistic_years integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS default_scenario_realistic_years integer DEFAULT 4,
  ADD COLUMN IF NOT EXISTS default_scenario_optimistic_years integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS default_scenario_message text,
  ADD COLUMN IF NOT EXISTS default_scenario_display text DEFAULT 'all';