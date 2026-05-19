-- Backfill simple text/numeric fields
UPDATE public.packages SET
  fixed_salary = COALESCE(fixed_salary, NULLIF(gross_salary, 0)::int),
  location     = COALESCE(location, location_city),
  job_title    = COALESCE(job_title, title);

-- Backfill start_date_specific when start_date is a valid YYYY-MM-DD
UPDATE public.packages
SET start_date_specific = start_date::date
WHERE start_date_specific IS NULL
  AND start_date ~ '^\d{4}-\d{2}-\d{2}$';

-- Backfill equity_* from first equity_devices row
UPDATE public.packages p SET
  equity_type          = COALESCE(p.equity_type, ed.type),
  equity_quantity      = COALESCE(p.equity_quantity, ed.quantity),
  equity_strike_price  = COALESCE(p.equity_strike_price, ed.strike_price),
  equity_vesting_years = COALESCE(p.equity_vesting_years, ed.vesting_years),
  equity_cliff_months  = COALESCE(p.equity_cliff_months, ed.cliff_months),
  equity_valuation     = COALESCE(p.equity_valuation, (ed.current_valuation_m * 1000000)::bigint),
  equity_notes         = COALESCE(p.equity_notes, ed.special_conditions)
FROM (
  SELECT DISTINCT ON (package_id)
    package_id, type, quantity, strike_price, vesting_years, cliff_months,
    current_valuation_m, special_conditions
  FROM public.equity_devices
  ORDER BY package_id, created_at ASC
) ed
WHERE p.id = ed.package_id;