-- Add monthly link quota
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS monthly_link_quota integer;

-- Backfill defaults based on existing plan
UPDATE public.organizations
SET monthly_link_quota = CASE
  WHEN plan = 'starter' THEN 10
  WHEN plan = 'pro' THEN 50
  WHEN plan = 'business' THEN 200
  WHEN plan = 'enterprise' THEN NULL
  ELSE 10
END
WHERE monthly_link_quota IS NULL;

-- Helper: count links sent this calendar month for an org
CREATE OR REPLACE FUNCTION public.links_sent_this_month(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.candidate_links
  WHERE organization_id = _org_id
    AND created_at >= date_trunc('month', now());
$$;