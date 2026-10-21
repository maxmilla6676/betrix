-- BETRIX security hardening
-- ---------------------------------------------------------------------------
-- * Links profiles to Supabase Auth (auth_id) and removes public read/write.
-- * Browsers (anon / authenticated) can only READ their own rows; admins can
--   read everything and manage leagues, matches and partners.
-- * Every balance change goes through SECURITY DEFINER functions that only the
--   server (service_role) may execute, each running in a single transaction
--   with row locks so balances cannot race or go negative.
-- Run this once in the Supabase SQL editor. It is safe to re-run.
-- ---------------------------------------------------------------------------

begin;

-- settle_slip gained a parameter; drop the old signature if an earlier draft created it.
drop function if exists public.settle_slip(text, text);

-- ── 1. Schema changes ──────────────────────────────────────────────────────

alter table public.profiles add column if not exists auth_id uuid unique references auth.users(id) on delete set null;
alter table public.profiles add column if not exists referred_by text;
alter table public.profiles add column if not exists has_deposited boolean not null default false;

update public.profiles set balance = 0 where balance is null or balance < 0;
update public.profiles set role = upper(coalesce(role, 'USER'));
alter table public.profiles alter column balance set default 0;
alter table public.profiles alter column balance set not null;
alter table public.profiles drop constraint if exists profiles_balance_nonneg;
alter table public.profiles add constraint profiles_balance_nonneg check (balance >= 0);
alter table public.profiles drop constraint if exists profiles_role_valid;
alter table public.profiles add constraint profiles_role_valid check (role in ('USER', 'ADMIN', 'PARTNER'));

alter table public.transactions drop constraint if exists transactions_type_valid;
alter table public.transactions add constraint transactions_type_valid
  check (type in ('DEPOSIT', 'WITHDRAWAL', 'STAKE', 'PAYOUT', 'REFUND')) not valid;
create index if not exists transactions_user_phone_idx on public.transactions (user_phone, created_at desc);

alter table public.slips add column if not exists settled_at timestamptz;
alter table public.slips drop constraint if exists slips_status_valid;
alter table public.slips add constraint slips_status_valid
  check (status in ('PENDING', 'WON', 'LOST', 'VOID')) not valid;
create index if not exists slips_user_phone_idx on public.slips (user_phone, created_at desc);
create index if not exists slips_pending_idx on public.slips (status) where status = 'PENDING';

-- Admin matches now carry the real score entered by an admin (no predetermined outcomes).
alter table public.admin_matches add column if not exists home_score int;
alter table public.admin_matches add column if not exists away_score int;
alter table public.admin_matches drop constraint if exists admin_matches_status_valid;
alter table public.admin_matches add constraint admin_matches_status_valid
  check (status in ('scheduled', 'live', 'finished', 'cancelled')) not valid;

create table if not exists public.payment_intents (
  reference text primary key,               -- SeevPlus checkout session reference
  order_id text unique not null,            -- our id, sent as meta + Idempotency-Key
  profile_id uuid not null references public.profiles(id),
  phone text not null,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'CREDITED', 'FAILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id text primary key,                      -- our id, used as the payout Idempotency-Key
  profile_id uuid not null references public.profiles(id),
  phone text not null,
  network text not null,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'RESERVED' check (status in ('RESERVED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  seev_reference text unique,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigserial primary key,
  actor uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── 2. Remove the old "everyone can do everything" access ──────────────────

drop policy if exists "Allow public read-write for profiles" on public.profiles;
drop policy if exists "Allow public read-write for transactions" on public.transactions;
drop policy if exists "Allow public read-write for slips" on public.slips;
drop policy if exists "Allow public read-write for partners" on public.partners;
drop policy if exists "Allow public read-write for partner_deposits" on public.partner_deposits;
drop policy if exists "Allow public read-write for admin_leagues" on public.admin_leagues;
drop policy if exists "Allow public read-write for admin_matches" on public.admin_matches;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.slips enable row level security;
alter table public.partners enable row level security;
alter table public.partner_deposits enable row level security;
alter table public.admin_leagues enable row level security;
alter table public.admin_matches enable row level security;
alter table public.payment_intents enable row level security;
alter table public.withdrawals enable row level security;
alter table public.audit_log enable row level security;

-- ── 3. Helper functions used by policies ───────────────────────────────────

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where auth_id = auth.uid() and role = 'ADMIN');
$$;

create or replace function public.current_phone() returns text
language sql stable security definer set search_path = public as $$
  select phone from public.profiles where auth_id = auth.uid() limit 1;
$$;

create or replace function public.current_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_id = auth.uid() limit 1;
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.current_phone() to anon, authenticated;
grant execute on function public.current_profile_id() to anon, authenticated;

-- ── 4. Read access (column-limited where it matters) ───────────────────────

-- password_hash is never readable from the browser.
grant select (id, user_id, phone, tier, role, balance, verified, referred_by, created_at, updated_at)
  on public.profiles to authenticated;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
  using (auth_id = auth.uid() or public.is_admin());

grant select on public.transactions to authenticated;
drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions for select to authenticated
  using (user_phone = public.current_phone() or public.is_admin());

grant select on public.slips to authenticated;
drop policy if exists slips_select_own on public.slips;
create policy slips_select_own on public.slips for select to authenticated
  using (user_phone = public.current_phone() or public.is_admin());

grant select on public.payment_intents to authenticated;
drop policy if exists payment_intents_select_own on public.payment_intents;
create policy payment_intents_select_own on public.payment_intents for select to authenticated
  using (profile_id = public.current_profile_id() or public.is_admin());

grant select on public.withdrawals to authenticated;
drop policy if exists withdrawals_select_own on public.withdrawals;
create policy withdrawals_select_own on public.withdrawals for select to authenticated
  using (profile_id = public.current_profile_id() or public.is_admin());

-- Partners see their own record (matched by phone); admins see and manage all.
grant select on public.partners to authenticated;
grant update (status, commission_rate) on public.partners to authenticated;
drop policy if exists partners_select on public.partners;
create policy partners_select on public.partners for select to authenticated
  using (phone = public.current_phone() or public.is_admin());
drop policy if exists partners_admin_update on public.partners;
create policy partners_admin_update on public.partners for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.partner_deposits to authenticated;
drop policy if exists partner_deposits_select on public.partner_deposits;
create policy partner_deposits_select on public.partner_deposits for select to authenticated
  using (
    public.is_admin()
    or partner_id in (select id from public.partners where phone = public.current_phone())
  );

-- Leagues and matches are public to read; only admins write.
grant select on public.admin_leagues, public.admin_matches to anon, authenticated;
grant insert, update, delete on public.admin_leagues, public.admin_matches to authenticated;
drop policy if exists admin_leagues_read on public.admin_leagues;
create policy admin_leagues_read on public.admin_leagues for select to anon, authenticated using (true);
drop policy if exists admin_leagues_write on public.admin_leagues;
create policy admin_leagues_write on public.admin_leagues for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin_matches_read on public.admin_matches;
create policy admin_matches_read on public.admin_matches for select to anon, authenticated using (true);
drop policy if exists admin_matches_write on public.admin_matches;
create policy admin_matches_write on public.admin_matches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.audit_log to authenticated;
drop policy if exists audit_log_admin_read on public.audit_log;
create policy audit_log_admin_read on public.audit_log for select to authenticated using (public.is_admin());

-- ── 5. Browser-callable functions ──────────────────────────────────────────

create or replace function public.admin_set_role(p_phone text, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_role not in ('USER', 'ADMIN', 'PARTNER') then
    raise exception 'INVALID_ROLE';
  end if;
  update public.profiles set role = p_role, updated_at = now() where phone = p_phone;
  insert into public.audit_log (actor, action, details)
    values (auth.uid(), 'admin_set_role', jsonb_build_object('phone', p_phone, 'role', p_role));
end $$;
grant execute on function public.admin_set_role(text, text) to authenticated;

-- Community booking codes: selections only, never who placed them or how much.
create or replace function public.public_slips(p_limit int default 10)
returns table (code text, selections jsonb, match_title text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.code, s.selections, s.match_title, s.status, s.created_at
  from public.slips s
  order by s.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;
grant execute on function public.public_slips(int) to anon, authenticated;

-- Booking code lookup (load someone's code into your slip).
create or replace function public.slip_by_code(p_code text)
returns table (code text, selections jsonb, match_title text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.code, s.selections, s.match_title, s.status, s.created_at
  from public.slips s where s.code = upper(trim(p_code)) limit 1;
$$;
grant execute on function public.slip_by_code(text) to anon, authenticated;

create or replace function public.apply_partner(
  p_name text, p_email text, p_phone text, p_channel text, p_audience_size text, p_code text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9-]', '', 'g'));
  v_id text := 'p-' || replace(gen_random_uuid()::text, '-', '');
begin
  if length(trim(coalesce(p_name, ''))) < 2 or length(p_name) > 120 then raise exception 'INVALID_NAME'; end if;
  if length(coalesce(p_phone, '')) > 20 or length(coalesce(p_email, '')) > 200
     or length(coalesce(p_channel, '')) > 200 or length(coalesce(p_audience_size, '')) > 60 then
    raise exception 'INVALID_INPUT';
  end if;
  if v_code = '' then
    v_code := 'BTX-' || upper(substr(md5(random()::text), 1, 5));
  elsif v_code not like 'BTX-%' then
    v_code := 'BTX-' || v_code;
  end if;
  if length(v_code) > 24 then raise exception 'INVALID_CODE'; end if;
  if exists (select 1 from public.partners where upper(code) = v_code) then raise exception 'CODE_TAKEN'; end if;
  insert into public.partners (id, name, email, phone, channel, audience_size, code, commission_rate, status)
    values (v_id, trim(p_name), trim(p_email), trim(p_phone), trim(p_channel), trim(p_audience_size), v_code, 10, 'PENDING');
  return v_code;
end $$;
grant execute on function public.apply_partner(text, text, text, text, text, text) to anon, authenticated;

-- ── 6. Server-only money functions (service_role) ──────────────────────────

create or replace function public.credit_deposit(p_reference text, p_amount numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_intent public.payment_intents%rowtype;
  v_profile public.profiles%rowtype;
  v_partner public.partners%rowtype;
  v_commission numeric;
begin
  select * into v_intent from public.payment_intents where reference = p_reference for update;
  if not found then raise exception 'UNKNOWN_REFERENCE'; end if;
  if v_intent.status = 'CREDITED' then
    return jsonb_build_object('credited', false, 'already_credited', true);
  end if;
  if p_amount is null or abs(p_amount - v_intent.amount) > 0.009 then
    raise exception 'AMOUNT_MISMATCH';
  end if;

  update public.payment_intents set status = 'CREDITED', updated_at = now() where reference = p_reference;
  update public.profiles set balance = balance + v_intent.amount, updated_at = now()
    where id = v_intent.profile_id returning * into v_profile;
  insert into public.transactions (id, user_phone, type, amount, method, reference, created_at)
    values ('TX-DEP-' || p_reference, v_profile.phone, 'DEPOSIT', v_intent.amount, 'SeevPlus', p_reference, now())
    on conflict (id) do nothing;

  if v_profile.referred_by is not null then
    select * into v_partner from public.partners
      where upper(code) = upper(v_profile.referred_by) and status = 'APPROVED' for update;
    if found then
      v_commission := round(v_intent.amount * coalesce(v_partner.commission_rate, 0) / 100, 2);
      insert into public.partner_deposits (id, partner_id, partner_code, user_phone, amount, commission_earned, status, created_at)
        values ('PD-' || p_reference, v_partner.id, v_partner.code,
                left(v_profile.phone, 3) || '***' || right(v_profile.phone, 4),
                v_intent.amount, v_commission, 'Completed', now())
        on conflict (id) do nothing;
      update public.partners set
        total_deposits = coalesce(total_deposits, 0) + v_intent.amount,
        earnings = coalesce(earnings, 0) + v_commission,
        active_users = coalesce(active_users, 0) + case when v_profile.has_deposited then 0 else 1 end
        where id = v_partner.id;
    end if;
  end if;

  update public.profiles set has_deposited = true where id = v_profile.id;
  return jsonb_build_object('credited', true, 'balance', v_profile.balance);
end $$;

create or replace function public.place_bet(
  p_profile_id uuid, p_code text, p_stake numeric, p_pot_win numeric, p_selections jsonb, p_match_title text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_profile public.profiles%rowtype;
begin
  if p_stake is null or p_stake <= 0 or p_pot_win is null or p_pot_win < p_stake then
    raise exception 'INVALID_STAKE';
  end if;
  select * into v_profile from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'UNKNOWN_PROFILE'; end if;
  if v_profile.balance < p_stake then raise exception 'INSUFFICIENT_BALANCE'; end if;

  update public.profiles set balance = balance - p_stake, updated_at = now()
    where id = p_profile_id returning * into v_profile;
  insert into public.slips (code, user_phone, stake, payout, pot_win, status, match_title, selections, created_at)
    values (p_code, v_profile.phone, p_stake, 0, p_pot_win, 'PENDING', p_match_title, p_selections, now());
  insert into public.transactions (id, user_phone, type, amount, method, reference, created_at)
    values ('TX-' || p_code, v_profile.phone, 'STAKE', p_stake, 'Bet Stake', p_code, now());
  return jsonb_build_object('balance', v_profile.balance);
end $$;

-- p_payout: for WON, the server-computed payout (void legs count as odds 1.00);
-- it is capped at the slip's pot_win.
create or replace function public.settle_slip(p_code text, p_status text, p_payout numeric default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_slip public.slips%rowtype;
  v_payout numeric;
begin
  if p_status not in ('WON', 'LOST', 'VOID') then raise exception 'INVALID_STATUS'; end if;
  select * into v_slip from public.slips where code = p_code for update;
  if not found then raise exception 'UNKNOWN_SLIP'; end if;
  if v_slip.status <> 'PENDING' then
    return jsonb_build_object('settled', false, 'status', v_slip.status);
  end if;

  if p_status = 'WON' then
    v_payout := least(coalesce(p_payout, v_slip.pot_win), v_slip.pot_win);
    if v_payout <= 0 then raise exception 'INVALID_PAYOUT'; end if;
    update public.slips set status = 'WON', payout = v_payout, settled_at = now() where code = p_code;
    update public.profiles set balance = balance + v_payout, updated_at = now() where phone = v_slip.user_phone;
    insert into public.transactions (id, user_phone, type, amount, method, reference, created_at)
      values ('TX-WIN-' || p_code, v_slip.user_phone, 'PAYOUT', v_payout, 'Winning Bet Payout', p_code, now())
      on conflict (id) do nothing;
  elsif p_status = 'VOID' then
    update public.slips set status = 'VOID', payout = v_slip.stake, settled_at = now() where code = p_code;
    update public.profiles set balance = balance + v_slip.stake, updated_at = now() where phone = v_slip.user_phone;
    insert into public.transactions (id, user_phone, type, amount, method, reference, created_at)
      values ('TX-VOID-' || p_code, v_slip.user_phone, 'REFUND', v_slip.stake, 'Void Bet Refund', p_code, now())
      on conflict (id) do nothing;
  else
    update public.slips set status = 'LOST', payout = 0, settled_at = now() where code = p_code;
  end if;
  return jsonb_build_object('settled', true, 'status', p_status);
end $$;

create or replace function public.request_withdrawal(
  p_profile_id uuid, p_id text, p_amount numeric, p_network text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_profile public.profiles%rowtype;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  select * into v_profile from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'UNKNOWN_PROFILE'; end if;
  if v_profile.balance < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;
  if exists (select 1 from public.withdrawals where profile_id = p_profile_id and status in ('RESERVED', 'PROCESSING')) then
    raise exception 'WITHDRAWAL_IN_PROGRESS';
  end if;

  update public.profiles set balance = balance - p_amount, updated_at = now()
    where id = p_profile_id returning * into v_profile;
  insert into public.withdrawals (id, profile_id, phone, network, amount, status)
    values (p_id, p_profile_id, v_profile.phone, p_network, p_amount, 'RESERVED');
  insert into public.transactions (id, user_phone, type, amount, method, reference, created_at)
    values ('TX-WTH-' || p_id, v_profile.phone, 'WITHDRAWAL', p_amount, 'Mobile Money (' || p_network || ')', p_id, now());
  return jsonb_build_object('balance', v_profile.balance);
end $$;

create or replace function public.update_withdrawal(
  p_id text, p_status text, p_seev_reference text default null, p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_w public.withdrawals%rowtype;
begin
  if p_status not in ('PROCESSING', 'COMPLETED', 'FAILED') then raise exception 'INVALID_STATUS'; end if;
  select * into v_w from public.withdrawals where id = p_id for update;
  if not found then raise exception 'UNKNOWN_WITHDRAWAL'; end if;
  if v_w.status in ('COMPLETED', 'FAILED') then
    return jsonb_build_object('updated', false, 'status', v_w.status);
  end if;

  update public.withdrawals set
    status = p_status,
    seev_reference = coalesce(p_seev_reference, seev_reference),
    failure_reason = coalesce(p_reason, failure_reason),
    updated_at = now()
    where id = p_id;

  if p_status = 'FAILED' then
    update public.profiles set balance = balance + v_w.amount, updated_at = now() where id = v_w.profile_id;
    insert into public.transactions (id, user_phone, type, amount, method, reference, created_at)
      values ('TX-RFD-' || p_id, v_w.phone, 'REFUND', v_w.amount, 'Withdrawal Refund', p_id, now())
      on conflict (id) do nothing;
  end if;
  return jsonb_build_object('updated', true, 'status', p_status);
end $$;

revoke all on function public.credit_deposit(text, numeric) from public, anon, authenticated;
revoke all on function public.place_bet(uuid, text, numeric, numeric, jsonb, text) from public, anon, authenticated;
revoke all on function public.settle_slip(text, text, numeric) from public, anon, authenticated;
revoke all on function public.request_withdrawal(uuid, text, numeric, text) from public, anon, authenticated;
revoke all on function public.update_withdrawal(text, text, text, text) from public, anon, authenticated;
grant execute on function public.credit_deposit(text, numeric) to service_role;
grant execute on function public.place_bet(uuid, text, numeric, numeric, jsonb, text) to service_role;
grant execute on function public.settle_slip(text, text, numeric) to service_role;
grant execute on function public.request_withdrawal(uuid, text, numeric, text) to service_role;
grant execute on function public.update_withdrawal(text, text, text, text) to service_role;

commit;
