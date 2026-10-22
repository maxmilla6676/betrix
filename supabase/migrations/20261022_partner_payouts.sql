-- BETRIX partner payouts
-- ---------------------------------------------------------------------------
-- Run AFTER 20261022_secure_betrix.sql. Safe to re-run.
--
-- Commission model: earned = total_deposits × commission_rate / 100, using the
-- partner's CURRENT rate (changing the rate recalculates what they've earned).
-- unpaid = earned − paid_out (never below zero). "Mark as paid" records a
-- payout for the unpaid amount and adds it to paid_out; total_deposits is
-- never reset.
-- ---------------------------------------------------------------------------

begin;

alter table public.partners add column if not exists paid_out numeric(12, 2) not null default 0;

create table if not exists public.partner_payouts (
  id bigserial primary key,
  partner_id text not null references public.partners(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  commission_rate numeric not null,          -- rate in effect when paid
  total_deposits_at numeric(12, 2) not null, -- partner's total deposits when paid
  paid_by uuid,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists partner_payouts_partner_idx on public.partner_payouts (partner_id, created_at desc);

alter table public.partner_payouts enable row level security;
grant select on public.partner_payouts to authenticated;
drop policy if exists partner_payouts_select on public.partner_payouts;
create policy partner_payouts_select on public.partner_payouts for select to authenticated
  using (
    public.is_admin()
    or partner_id in (select id from public.partners where phone = public.current_phone())
  );

-- Partners log in with their phone, so store it in the same 0XXXXXXXXX form as profiles.
create or replace function public.normalize_gh_phone(p text) returns text
language sql immutable as $$
  select case
    when v like '+233%' then '0' || substr(v, 5)
    when v like '233%' and length(v) = 12 then '0' || substr(v, 4)
    else v
  end
  from (select regexp_replace(coalesce(p, ''), '[\s\-()]', '', 'g') as v) s;
$$;

update public.partners set phone = public.normalize_gh_phone(phone) where phone is not null;

create or replace function public.apply_partner(
  p_name text, p_email text, p_phone text, p_channel text, p_audience_size text, p_code text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9-]', '', 'g'));
  v_id text := 'p-' || replace(gen_random_uuid()::text, '-', '');
  v_phone text := public.normalize_gh_phone(p_phone);
begin
  if length(trim(coalesce(p_name, ''))) < 2 or length(p_name) > 120 then raise exception 'INVALID_NAME'; end if;
  if v_phone !~ '^0[0-9]{9}$' then raise exception 'INVALID_PHONE'; end if;
  if length(coalesce(p_email, '')) > 200
     or length(coalesce(p_channel, '')) > 200 or length(coalesce(p_audience_size, '')) > 60 then
    raise exception 'INVALID_INPUT';
  end if;
  if exists (select 1 from public.partners where phone = v_phone and status in ('PENDING', 'APPROVED')) then
    raise exception 'PHONE_TAKEN';
  end if;
  if v_code = '' then
    v_code := 'BTX-' || upper(substr(md5(random()::text), 1, 5));
  elsif v_code not like 'BTX-%' then
    v_code := 'BTX-' || v_code;
  end if;
  if length(v_code) > 24 then raise exception 'INVALID_CODE'; end if;
  if exists (select 1 from public.partners where upper(code) = v_code) then raise exception 'CODE_TAKEN'; end if;
  insert into public.partners (id, name, email, phone, channel, audience_size, code, commission_rate, status)
    values (v_id, trim(p_name), trim(p_email), v_phone, trim(p_channel), trim(p_audience_size), v_code, 10, 'PENDING');
  return v_code;
end $$;
grant execute on function public.apply_partner(text, text, text, text, text, text) to anon, authenticated;

-- Admin pays out everything currently owed to a partner. Atomic: the partner row
-- is locked, so two clicks can't pay twice.
create or replace function public.admin_mark_partner_paid(p_partner_id text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_partner public.partners%rowtype;
  v_earned numeric;
  v_due numeric;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_partner from public.partners where id = p_partner_id for update;
  if not found then raise exception 'UNKNOWN_PARTNER'; end if;

  v_earned := round(coalesce(v_partner.total_deposits, 0) * coalesce(v_partner.commission_rate, 0) / 100, 2);
  v_due := round(v_earned - coalesce(v_partner.paid_out, 0), 2);
  if v_due <= 0 then raise exception 'NOTHING_TO_PAY'; end if;

  insert into public.partner_payouts (partner_id, amount, commission_rate, total_deposits_at, paid_by, note)
    values (p_partner_id, v_due, v_partner.commission_rate, coalesce(v_partner.total_deposits, 0), auth.uid(), nullif(trim(p_note), ''));
  update public.partners set paid_out = coalesce(paid_out, 0) + v_due where id = p_partner_id;
  insert into public.audit_log (actor, action, details)
    values (auth.uid(), 'partner_paid', jsonb_build_object('partner_id', p_partner_id, 'amount', v_due, 'rate', v_partner.commission_rate));
  return jsonb_build_object('paid', v_due);
end $$;
revoke all on function public.admin_mark_partner_paid(text, text) from public, anon;
grant execute on function public.admin_mark_partner_paid(text, text) to authenticated;

-- Log commission-rate changes too (they change what the partner has earned).
create or replace function public.log_partner_rate_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.commission_rate is distinct from old.commission_rate then
    insert into public.audit_log (actor, action, details)
      values (auth.uid(), 'partner_rate_changed',
              jsonb_build_object('partner_id', new.id, 'from', old.commission_rate, 'to', new.commission_rate));
  end if;
  return new;
end $$;
drop trigger if exists partners_rate_audit on public.partners;
create trigger partners_rate_audit after update of commission_rate on public.partners
  for each row execute function public.log_partner_rate_change();

commit;
