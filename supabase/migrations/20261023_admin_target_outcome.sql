-- Add target outcome columns and match duration support for admin scripted matches
ALTER TABLE public.admin_matches ADD COLUMN IF NOT EXISTS outcome text DEFAULT 'home';
ALTER TABLE public.admin_matches ADD COLUMN IF NOT EXISTS outcome_score text DEFAULT '1-0';
ALTER TABLE public.admin_matches ADD COLUMN IF NOT EXISTS target_home_score int;
ALTER TABLE public.admin_matches ADD COLUMN IF NOT EXISTS target_away_score int;
ALTER TABLE public.admin_matches ADD COLUMN IF NOT EXISTS duration_minutes int DEFAULT 90;

ALTER TABLE public.admin_leagues ADD COLUMN IF NOT EXISTS default_target_outcome text;
ALTER TABLE public.admin_leagues ADD COLUMN IF NOT EXISTS default_outcome_score text;
