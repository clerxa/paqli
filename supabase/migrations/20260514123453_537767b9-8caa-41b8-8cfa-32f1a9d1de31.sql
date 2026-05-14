
ALTER TABLE public.candidate_links
  ADD COLUMN IF NOT EXISTS behavior_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS engagement_score integer,
  ADD COLUMN IF NOT EXISTS engagement_label text,
  ADD COLUMN IF NOT EXISTS intent_prediction text,
  ADD COLUMN IF NOT EXISTS intent_computed_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_visits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_on_page_total integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.behavior_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.candidate_links(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  section text,
  value text,
  duration_s integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.behavior_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH can read own org behavior events"
  ON public.behavior_events FOR SELECT
  TO authenticated
  USING (
    link_id IN (
      SELECT cl.id FROM public.candidate_links cl
      WHERE cl.organization_id = public.current_user_org()
    )
  );

CREATE INDEX IF NOT EXISTS idx_behavior_events_link
  ON public.behavior_events(link_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_behavior_events_type
  ON public.behavior_events(event_type);
