-- Migration: Robust partner referral matching for credit_deposit
-- Ensures any deposit made by a user whose profile has referred_by set (with or without BTX- prefix)
-- is reliably credited to the partner and tracked in partner_deposits and partner totals.

create or replace function public.credit_deposit(p_reference text, p_amount numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_intent public.payment_intents%rowtype;
  v_profile public.profiles%rowtype;
  v_partner public.partners%rowtype;
  v_commission numeric;
  v_clean_ref text;
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

  if v_profile.referred_by is not null and length(trim(v_profile.referred_by)) > 0 then
    v_clean_ref := upper(trim(replace(v_profile.referred_by, 'BTX-', '')));
    select * into v_partner from public.partners
      where (
        upper(code) = upper(trim(v_profile.referred_by))
        or upper(replace(code, 'BTX-', '')) = v_clean_ref
        or upper(code) = 'BTX-' || v_clean_ref
      )
      and status = 'APPROVED'
      order by created_at asc
      limit 1
      for update;

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

revoke all on function public.credit_deposit(text, numeric) from public, anon, authenticated;
grant execute on function public.credit_deposit(text, numeric) to service_role;
