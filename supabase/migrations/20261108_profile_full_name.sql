-- The account holder's real name, sent to SeevPlus as the payer / payout recipient name
-- instead of a "BETRIX <id>" placeholder. Collected on the deposit form.
alter table public.profiles add column if not exists full_name text;
