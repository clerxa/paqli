CREATE OR REPLACE FUNCTION public.links_sent_this_month(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.candidate_links
  WHERE organization_id = _org_id
    AND created_at >= date_trunc('month', now());
$$;