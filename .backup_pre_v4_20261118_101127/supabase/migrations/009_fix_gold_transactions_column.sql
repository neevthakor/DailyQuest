-- 009_fix_gold_transactions_column.sql
-- Fix: migrations 007/008 created functions referencing a non-existent 'description'
-- column in gold_transactions. The actual column is 'reason' (from 005_gold_economy.sql).
-- This migration:
--   1. Relaxes the transaction_type CHECK to also allow 'reward' and 'purchase'
--   2. Re-creates all affected functions to use 'reason' instead of 'description'
-- Safe/idempotent: no data is dropped or deleted.

-- Step 1: Relax the transaction_type CHECK constraint
-- Drop old constraint and add new one that includes 'reward' and 'purchase'
alter table public.gold_transactions
  drop constraint if exists gold_transactions_transaction_type_check;

alter table public.gold_transactions
  add constraint gold_transactions_transaction_type_check
    check (transaction_type in ('earn', 'spend', 'reward', 'purchase'));

-- Step 2: Re-create purchase_shop_item to use 'reason' instead of 'description'
create or replace function public.purchase_shop_item(p_item_id text, p_cost integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_coins integer;
  v_existing_boost record;
  v_duration interval;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'not_authenticated'); end if;

  select coins into v_coins from public.profiles where id = v_uid for update;
  if not found then return jsonb_build_object('success', false, 'reason', 'profile_not_found'); end if;

  if v_coins < p_cost then return jsonb_build_object('success', false, 'reason', 'insufficient_funds'); end if;

  -- Handle specific items
  if p_item_id = 'xp_multiplier_2x' or p_item_id = 'extra_tasks_5' then
    v_duration := '24 hours'::interval;
    
    select * into v_existing_boost from public.user_active_boosts 
    where user_id = v_uid and boost_type = p_item_id limit 1 for update;

    if found then
      update public.user_active_boosts
      set expires_at = greatest(expires_at, now()) + v_duration, updated_at = now()
      where id = v_existing_boost.id;
    else
      insert into public.user_active_boosts (user_id, boost_type, expires_at)
      values (v_uid, p_item_id, now() + v_duration);
    end if;
  else
    return jsonb_build_object('success', false, 'reason', 'invalid_item');
  end if;

  -- Deduct coins and log transaction
  update public.profiles set coins = coins - p_cost where id = v_uid;

  insert into public.gold_transactions (user_id, amount, transaction_type, reason)
  values (v_uid, -p_cost, 'purchase', 'Purchased ' || p_item_id);

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.purchase_shop_item(text, integer) from public;
grant execute on function public.purchase_shop_item(text, integer) to authenticated;

-- Step 3: Re-create claim_daily_reward to use 'reason' instead of 'description'
create or replace function public.claim_daily_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile record;
  v_reward integer;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'not_authenticated'); end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then return jsonb_build_object('success', false, 'reason', 'profile_not_found'); end if;

  if v_profile.last_daily_reward_claim_date = current_date then
    return jsonb_build_object('success', false, 'reason', 'already_claimed');
  end if;

  if v_profile.last_daily_reward_claim_date = current_date - 1 then
    update public.profiles set daily_reward_streak = daily_reward_streak + 1 where id = v_uid;
    v_profile.daily_reward_streak := v_profile.daily_reward_streak + 1;
  else
    update public.profiles set daily_reward_streak = 1 where id = v_uid;
    v_profile.daily_reward_streak := 1;
  end if;

  -- Reward calculation logic (e.g. 50 base + 10 * streak up to 200)
  v_reward := least(50 + (v_profile.daily_reward_streak - 1) * 10, 200);

  update public.profiles 
  set coins = coins + v_reward, last_daily_reward_claim_date = current_date 
  where id = v_uid;

  insert into public.gold_transactions (user_id, amount, transaction_type, reason)
  values (v_uid, v_reward, 'reward', 'Daily Reward (Streak: ' || v_profile.daily_reward_streak || ')');

  return jsonb_build_object('success', true, 'reward', v_reward, 'streak', v_profile.daily_reward_streak);
end;
$$;

revoke all on function public.claim_daily_reward() from public;
grant execute on function public.claim_daily_reward() to authenticated;

-- Step 4: Re-create complete_daily_quest to use 'reason' instead of 'description'
create or replace function public.complete_daily_quest(p_quest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_quest record;
  v_coins_awarded integer;
  v_xp_awarded integer;
  v_profile record;
  v_has_xp_boost boolean;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'not_authenticated'); end if;

  select * into v_quest from public.daily_quests where id = p_quest_id and user_id = v_uid for update;
  
  if not found then return jsonb_build_object('success', false, 'reason', 'not_found'); end if;
  if v_quest.completed then return jsonb_build_object('success', false, 'reason', 'already_completed'); end if;

  -- Check for active 2x XP boost
  select exists (
    select 1 from public.user_active_boosts 
    where user_id = v_uid and boost_type = 'xp_multiplier_2x' and expires_at > now()
  ) into v_has_xp_boost;

  update public.daily_quests 
  set completed = true, completed_at = now() 
  where id = p_quest_id;

  v_coins_awarded := v_quest.coin_reward;
  v_xp_awarded := case when v_has_xp_boost then v_quest.xp_reward * 2 else v_quest.xp_reward end;

  update public.profiles
  set 
    xp = xp + v_xp_awarded,
    coins = coins + v_coins_awarded,
    total_quests_completed = total_quests_completed + 1,
    total_xp = total_xp + v_xp_awarded
  where id = v_uid
  returning * into v_profile;

  if v_coins_awarded > 0 then
    insert into public.gold_transactions (user_id, amount, transaction_type, reason)
    values (v_uid, v_coins_awarded, 'reward', 'Completed quest: ' || v_quest.title);
  end if;

  return jsonb_build_object(
    'success', true,
    'xp_awarded', v_xp_awarded,
    'coins_awarded', v_coins_awarded,
    'profile', row_to_json(v_profile)
  );
end;
$$;

-- Step 5: Re-create approve_payment_request to use 'reason' instead of 'description'
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
  v_gold_reward := case when v_payment.plan = 'yearly' then 1500000 else 100000 end;

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

  insert into public.gold_transactions (user_id, amount, transaction_type, reason)
  values (v_payment.user_id, v_gold_reward, 'reward', 'Premium Subscription Reward (' || v_payment.plan || ')');

  return jsonb_build_object('success', true);
end;
$$;
