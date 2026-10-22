-- BETRIX admin deletion of users and partners
-- ---------------------------------------------------------------------------
-- Run AFTER 20261022_partner_payouts.sql. Safe to re-run.
-- ---------------------------------------------------------------------------

begin;

-- Keep payment/withdrawal records when a profile is deleted (for accounting).
alter table public.payment_intents alter column profile_id drop not null;
alter table public.payment_intents drop constraint if exists payment_intents_profile_id_fkey;
alter table public.payment_intents add constraint payment_intents_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete set null;

alter table public.withdrawals alter column profile_id drop not null;
alter table public.withdrawals drop constraint if exists withdrawals_profile_id_fkey;
alter table public.withdrawals add constraint withdrawals_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete set null;

-- Delete a user. Refuses while money or bets are still open, so nothing is lost.
-- Bets and transactions are kept but detached from the phone number, so a new
-- account on the same number can't see them.
create or replace function public.admin_delete_user(p_profile_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user public.profiles%rowtype;
  v_detached text;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_user from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'UNKNOWN_USER'; end if;
  if v_user.auth_id = auth.uid() then raise exception 'CANNOT_DELETE_SELF'; end if;
  if v_user.role = 'ADMIN' then raise exception 'DEMOTE_ADMIN_FIRST'; end if;
  if coalesce(v_user.balance, 0) > 0 then raise exception 'HAS_BALANCE'; end if;
  if exists (select 1 from public.slips where user_phone = v_user.phone and status = 'PENDING') then
    raise exception 'HAS_PENDING_BETS';
  end if;
  if exists (select 1 from public.withdrawals where profile_id = v_user.id and status in ('RESERVED', 'PROCESSING')) then
    raise exception 'HAS_OPEN_WITHDRAWAL';
  end if;

  v_detached := 'deleted:' || v_user.id::text;
  update public.slips set user_phone = v_detached where user_phone = v_user.phone;
  update public.transactions set user_phone = v_detached where user_phone = v_user.phone;
  update public.payment_intents set phone = v_detached where profile_id = v_user.id;
  update public.withdrawals set phone = v_detached where profile_id = v_user.id;

  delete from public.profiles where id = v_user.id;
  if v_user.auth_id is not null then
    delete from auth.users where id = v_user.auth_id;
  end if;

  insert into public.audit_log (actor, action, details)
    values (auth.uid(), 'user_deleted', jsonb_build_object('profile_id', v_user.id, 'phone', v_user.phone, 'user_id', v_user.user_id));
  return jsonb_build_object('deleted', true);
end $$;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- Delete a partner (any status). Unpaid commission is forfeited; the summary is
-- kept in the audit log. Referred users stop earning anyone commission.
create or replace function public.admin_delete_partner(p_partner_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_partner public.partners%rowtype;
  v_unpaid numeric;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_partner from public.partners where id = p_partner_id for update;
  if not found then raise exception 'UNKNOWN_PARTNER'; end if;

  v_unpaid := greatest(0, round(coalesce(v_partner.total_deposits, 0) * coalesce(v_partner.commission_rate, 0) / 100, 2)
                          - coalesce(v_partner.paid_out, 0));

  update public.profiles set referred_by = null where upper(referred_by) = upper(v_partner.code);
  delete from public.partner_deposits where partner_id = v_partner.id;
  delete from public.partners where id = v_partner.id; -- partner_payouts cascade

  insert into public.audit_log (actor, action, details)
    values (auth.uid(), 'partner_deleted', jsonb_build_object(
      'partner_id', v_partner.id, 'name', v_partner.name, 'code', v_partner.code, 'phone', v_partner.phone,
      'status', v_partner.status, 'total_deposits', v_partner.total_deposits,
      'commission_rate', v_partner.commission_rate, 'paid_out', v_partner.paid_out, 'unpaid_forfeited', v_unpaid));
  return jsonb_build_object('deleted', true, 'unpaid_forfeited', v_unpaid);
end $$;
revoke all on function public.admin_delete_partner(text) from public, anon;
grant execute on function public.admin_delete_partner(text) to authenticated;

-- Partner applications now go through the server (/api/partners/apply), which
-- verifies the applicant owns the phone number. Close the direct browser path.
revoke all on function public.apply_partner(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_partner(text, text, text, text, text, text) to service_role;

commit;
