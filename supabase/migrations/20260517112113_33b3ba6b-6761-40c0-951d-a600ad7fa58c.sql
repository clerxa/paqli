CREATE TABLE public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  company text,
  source text default 'landing_page',
  created_at timestamptz not null default now()
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit demo request"
  ON public.demo_requests
  FOR INSERT
  WITH CHECK (true);
