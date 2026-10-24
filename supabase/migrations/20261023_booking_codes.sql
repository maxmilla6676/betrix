-- Migration: Add booking_codes table and update slip_by_code lookup
CREATE TABLE IF NOT EXISTS public.booking_codes (
  code text PRIMARY KEY,
  selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  match_title text,
  stake numeric DEFAULT 0,
  pot_win numeric DEFAULT 0,
  total_odds numeric DEFAULT 1,
  created_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_codes_created_idx ON public.booking_codes (created_at DESC);

ALTER TABLE public.booking_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read booking codes" ON public.booking_codes;
CREATE POLICY "Public can read booking codes" ON public.booking_codes
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert booking codes" ON public.booking_codes;
CREATE POLICY "Anyone can insert booking codes" ON public.booking_codes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can delete booking codes" ON public.booking_codes;
CREATE POLICY "Admin can delete booking codes" ON public.booking_codes
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Update slip_by_code to look up from booking_codes first, then active/historic slips
CREATE OR REPLACE FUNCTION public.slip_by_code(p_code text)
RETURNS TABLE (code text, selections jsonb, match_title text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.code, b.selections, b.match_title, 'BOOKED' as status, b.created_at
  FROM public.booking_codes b
  WHERE upper(trim(b.code)) = upper(trim(p_code))
  UNION ALL
  SELECT s.code, s.selections, s.match_title, s.status, s.created_at
  FROM public.slips s
  WHERE upper(trim(s.code)) = upper(trim(p_code))
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.slip_by_code(text) TO anon, authenticated;

-- Function to list recent active booking codes
CREATE OR REPLACE FUNCTION public.public_booking_codes(p_limit int DEFAULT 20)
RETURNS TABLE (code text, selections jsonb, match_title text, total_odds numeric, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.code, b.selections, b.match_title, b.total_odds, b.created_at
  FROM public.booking_codes b
  ORDER BY b.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
GRANT EXECUTE ON FUNCTION public.public_booking_codes(int) TO anon, authenticated;
