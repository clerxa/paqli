CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_link ON public.ai_conversations(link_id, created_at);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH can read own org ai conversations"
ON public.ai_conversations
FOR SELECT
TO authenticated
USING (link_id IN (SELECT id FROM public.candidate_links WHERE organization_id = current_user_org()));
