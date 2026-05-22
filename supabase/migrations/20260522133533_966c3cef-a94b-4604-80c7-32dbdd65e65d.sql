
ALTER TABLE public.equity_devices
  ADD COLUMN IF NOT EXISTS award_year integer,
  ADD COLUMN IF NOT EXISTS regime text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS conservation_end_date date,
  ADD COLUMN IF NOT EXISTS total_acquisition_gain numeric;

ALTER TABLE public.equity_devices
  ADD CONSTRAINT equity_devices_currency_check
  CHECK (currency IN ('EUR', 'USD'));

ALTER TABLE public.equity_devices
  ADD CONSTRAINT equity_devices_regime_check
  CHECK (regime IS NULL OR regime IN ('AGA_PRE2012','AGA_2012_2015','AGA_2015_2016','AGA_2017','AGA_POST2018','NON_QUALIFIE'));
