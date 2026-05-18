ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS benchmark_analysis jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS benchmark_analyzed_at timestamptz DEFAULT NULL;