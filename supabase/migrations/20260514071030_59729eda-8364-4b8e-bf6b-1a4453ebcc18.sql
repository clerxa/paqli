
-- Extend candidate_links with decision tracking
ALTER TABLE public.candidate_links
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS decline_category text,
  ADD COLUMN IF NOT EXISTS decline_reason text;

CREATE INDEX IF NOT EXISTS idx_candidate_links_status
  ON public.candidate_links(organization_id, status);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.candidate_links(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('candidate', 'rh')),
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_link_date
  ON public.messages(link_id, created_at ASC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH can view org messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    link_id IN (
      SELECT id FROM public.candidate_links
      WHERE organization_id = public.current_user_org()
    )
  );

CREATE POLICY "RH can insert org messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    link_id IN (
      SELECT id FROM public.candidate_links
      WHERE organization_id = public.current_user_org()
    )
  );

CREATE POLICY "RH can update org messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    link_id IN (
      SELECT id FROM public.candidate_links
      WHERE organization_id = public.current_user_org()
    )
  );

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.candidate_links REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_links;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
