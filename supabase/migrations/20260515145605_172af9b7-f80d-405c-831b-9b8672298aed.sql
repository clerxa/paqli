ALTER TABLE public.candidate_links
  ALTER COLUMN package_id DROP NOT NULL;

ALTER TABLE public.candidate_links
  DROP CONSTRAINT IF EXISTS candidate_links_package_id_fkey;

ALTER TABLE public.candidate_links
  ADD CONSTRAINT candidate_links_package_id_fkey
  FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;