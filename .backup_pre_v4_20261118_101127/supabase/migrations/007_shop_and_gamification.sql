-- 007_shop_and_gamification.sql

create table if not exists public.user_active_boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  boost_type text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_active_boosts enable row level security;

drop policy if exists "Boosts selectable by owner" on public.user_active_boosts;
create policy "Boosts selectable by owner"
on public.user_active_boosts for select to authenticated using (auth.uid() = user_id);

-- Alter profiles to track daily rewards
alter table public.profiles
add column if not exists last_daily_reward_claim_date date,
add column if not exists daily_reward_streak integer not null default 0 check (daily_reward_streak >= 0);

-- Purchase Shop Item RPC
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

  insert into public.gold_transactions (user_id, amount, transaction_type, description)
  values (v_uid, -p_cost, 'purchase', 'Purchased ' || p_item_id);

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.purchase_shop_item(text, integer) from public;
grant execute on function public.purchase_shop_item(text, integer) to authenticated;

-- Claim Daily Reward RPC
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

  insert into public.gold_transactions (user_id, amount, transaction_type, description)
  values (v_uid, v_reward, 'reward', 'Daily Reward (Streak: ' || v_profile.daily_reward_streak || ')');

  return jsonb_build_object('success', true, 'reward', v_reward, 'streak', v_profile.daily_reward_streak);
end;
$$;

revoke all on function public.claim_daily_reward() from public;
grant execute on function public.claim_daily_reward() to authenticated;

-- Update complete_daily_quest to respect XP multiplier
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
    insert into public.gold_transactions (user_id, amount, transaction_type, description)
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
