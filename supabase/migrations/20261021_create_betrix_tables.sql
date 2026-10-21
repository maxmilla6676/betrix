-- SUPERSEDED by 20261022_secure_betrix.sql. Do NOT re-run this file after that one:
-- its GRANT ALL + "USING (true)" policies would reopen every table to the public.

-- BETRIX Production Database Migration
-- Tables: profiles, transactions, slips, partners, partner_deposits, admin_leagues, admin_matches

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  phone text UNIQUE NOT NULL,
  password_hash text,
  tier text DEFAULT 'Bronze',
  role text DEFAULT 'USER', -- 'USER' | 'ADMIN'
  balance numeric DEFAULT 0.00,
  verified boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'USER';
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_key'
  ) THEN 
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
  END IF; 
END $$;


CREATE TABLE IF NOT EXISTS public.transactions (
  id text PRIMARY KEY,
  user_phone text,
  type text NOT NULL, -- 'DEPOSIT' | 'WITHDRAWAL' | 'STAKE' | 'PAYOUT'
  amount numeric NOT NULL,
  method text,
  reference text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.slips (
  code text PRIMARY KEY,
  user_phone text,
  stake numeric NOT NULL,
  payout numeric DEFAULT 0,
  pot_win numeric,
  status text DEFAULT 'PENDING', -- 'PENDING' | 'WON' | 'LOST'
  match_title text,
  selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partners (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  channel text,
  audience_size text,
  code text UNIQUE NOT NULL,
  commission_rate numeric DEFAULT 12,
  status text DEFAULT 'APPROVED', -- 'PENDING' | 'APPROVED' | 'REJECTED'
  signups int DEFAULT 0,
  active_users int DEFAULT 0,
  total_deposits numeric DEFAULT 0,
  earnings numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_deposits (
  id text PRIMARY KEY,
  partner_id text NOT NULL,
  partner_code text NOT NULL,
  user_phone text,
  amount numeric NOT NULL,
  commission_earned numeric NOT NULL,
  status text DEFAULT 'Completed',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_leagues (
  id text PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  color text DEFAULT '#F5C400',
  logo_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_matches (
  id text PRIMARY KEY,
  league_id text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_logo_url text,
  away_logo_url text,
  kickoff_date text NOT NULL,
  kickoff_time text NOT NULL,
  outcome text DEFAULT 'home',
  outcome_score text DEFAULT '1-0',
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);

-- Grant privileges to anon and authenticated API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Enable Row Level Security (RLS) with open public access policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-write for profiles" ON public.profiles;
CREATE POLICY "Allow public read-write for profiles" ON public.profiles FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for transactions" ON public.transactions;
CREATE POLICY "Allow public read-write for transactions" ON public.transactions FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for slips" ON public.slips;
CREATE POLICY "Allow public read-write for slips" ON public.slips FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for partners" ON public.partners;
CREATE POLICY "Allow public read-write for partners" ON public.partners FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for partner_deposits" ON public.partner_deposits;
CREATE POLICY "Allow public read-write for partner_deposits" ON public.partner_deposits FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for admin_leagues" ON public.admin_leagues;
CREATE POLICY "Allow public read-write for admin_leagues" ON public.admin_leagues FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for admin_matches" ON public.admin_matches;
CREATE POLICY "Allow public read-write for admin_matches" ON public.admin_matches FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
