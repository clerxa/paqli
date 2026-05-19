ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS hiring_manager_email text,
ADD COLUMN IF NOT EXISTS hiring_manager_linkedin text;