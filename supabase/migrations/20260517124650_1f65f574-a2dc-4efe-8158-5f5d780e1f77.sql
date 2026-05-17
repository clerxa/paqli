
CREATE TABLE public.hr_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  link_id uuid NOT NULL,
  package_id uuid,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  message text NOT NULL,
  suggestion_message text,
  trigger_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'unread',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  actioned_at timestamptz
);

CREATE UNIQUE INDEX hr_alerts_active_unique
  ON public.hr_alerts (link_id, type)
  WHERE status IN ('unread', 'read');

CREATE INDEX hr_alerts_org_status_idx
  ON public.hr_alerts (organization_id, status, created_at DESC);

ALTER TABLE public.hr_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own org alerts"
  ON public.hr_alerts FOR SELECT TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "Members update own org alerts"
  ON public.hr_alerts FOR UPDATE TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "Members insert own org alerts"
  ON public.hr_alerts FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_user_org());

CREATE POLICY "Members delete own org alerts"
  ON public.hr_alerts FOR DELETE TO authenticated
  USING (organization_id = current_user_org());

CREATE TRIGGER hr_alerts_set_updated_at
  BEFORE UPDATE ON public.hr_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
