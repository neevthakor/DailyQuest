-- 008_premium_rewards.sql

create or replace function public.approve_payment_request(p_payment_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_payment record;
  v_months integer;
  v_gold_reward integer := 0;
begin
  if v_uid != 'b3b8976d-82e1-43b6-bbdf-00d7b8c82f7e' then
    return jsonb_build_object('success', false, 'reason', 'unauthorized');
  end if;

  select * into v_payment from public.payment_requests where id = p_payment_request_id for update;
  if not found then return jsonb_build_object('success', false, 'reason', 'not_found'); end if;
  if v_payment.status != 'pending' then return jsonb_build_object('success', false, 'reason', 'not_pending'); end if;

  update public.payment_requests 
  set status = 'approved', reviewed_at = now(), reviewed_by = v_uid
  where id = p_payment_request_id;

  v_months := case when v_payment.plan = 'yearly' then 12 else 1 end;
  v_gold_reward := case when v_payment.plan = 'yearly' then 300000 else 20000 end;

  insert into public.user_entitlements (user_id, is_premium, plan, status, expires_at, updated_at)
  values (v_payment.user_id, true, v_payment.plan, 'active', now() + (v_months || ' months')::interval, now())
  on conflict (user_id) do update set
    is_premium = true,
    plan = excluded.plan,
    status = 'active',
    expires_at = greatest(coalesce(public.user_entitlements.expires_at, now()), now()) + (v_months || ' months')::interval,
    updated_at = now();

  -- Award one-time Gold for this specific payment approval
  update public.profiles set coins = coins + v_gold_reward where id = v_payment.user_id;

  insert into public.gold_transactions (user_id, amount, transaction_type, description)
  values (v_payment.user_id, v_gold_reward, 'reward', 'Premium Subscription Reward (' || v_payment.plan || ')');

  return jsonb_build_object('success', true);
end;
$$;
