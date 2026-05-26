ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS equity_ticker text,
  ADD COLUMN IF NOT EXISTS equity_is_listed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS equity_company_valuation bigint,
  ADD COLUMN IF NOT EXISTS equity_total_shares bigint,
  ADD COLUMN IF NOT EXISTS equity_last_round_date date,
  ADD COLUMN IF NOT EXISTS equity_scenario_bear numeric(4,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS equity_scenario_base numeric(4,2) DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS equity_scenario_bull numeric(4,2) DEFAULT 7.0,
  ADD COLUMN IF NOT EXISTS equity_last_price numeric(12,4),
  ADD COLUMN IF NOT EXISTS equity_last_price_currency text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS equity_price_fetched_at timestamptz;