ALTER TABLE public.equity_devices
  ADD COLUMN IF NOT EXISTS vesting_schedule jsonb;

COMMENT ON COLUMN public.equity_devices.vesting_schedule IS
  'Array of vesting phases: [{startMonth:int, durationMonths:int, frequency:"monthly|quarterly|semi|annual", percentage:number}]. If null, fallback to linear annual over vesting_years with cliff_months.';