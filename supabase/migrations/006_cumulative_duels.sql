-- 1. Add total_duel_points to profiles and backfill securely from valid history
alter table public.profiles
add column if not exists total_duel_points integer not null default 0;

update public.profiles p
set total_duel_points = coalesce(
  (select sum(score)::integer from public.duel_scores ds where ds.user_id = p.id),
  0
);

-- 2. Alter duel_scores to enforce exactly-once tracking for normal attempts and retries
alter table public.duel_scores
add column if not exists is_retry boolean not null default false;

-- Drop the old constraint
alter table public.duel_scores
drop constraint if exists duel_scores_one_per_day;

-- Add the new constraint
alter table public.duel_scores
add constraint duel_scores_unique_attempt unique (user_id, duel_date, is_retry);

-- 3. Overhaul submit_daily_duel to exactly-once add points
create or replace function public.submit_daily_duel(
  p_duel_date date,
  p_challenge_type text,
  p_score integer,
  p_duration_ms integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_score integer := greatest(0, coalesce(p_score, 0));
  v_duel_id uuid;
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  insert into public.duel_scores (user_id, duel_date, challenge_type, score, duration_ms, is_retry)
  values (v_uid, p_duel_date, p_challenge_type, v_score, greatest(0, p_duration_ms), false)
  on conflict (user_id, duel_date, is_retry) do nothing
  returning id into v_duel_id;

  if v_duel_id is null then
    return jsonb_build_object('success', false, 'reason', 'already_played');
  end if;

  update public.profiles
  set xp = xp + 50,
      coins = coins + 50,
      total_xp = total_xp + 50,
      best_duel_score = greatest(best_duel_score, v_score),
      total_duel_points = total_duel_points + v_score
  where id = v_uid
  returning * into v_profile;

  insert into public.gold_transactions (user_id, amount, transaction_type, reason)
  values (v_uid, 50, 'earn', 'Daily Duel Reward');

  return jsonb_build_object(
    'success', true,
    'xp_awarded', 50,
    'coins_awarded', 50,
    'profile', to_jsonb(v_profile)
  );
end;
$$;

-- 4. Create submit_daily_duel_retry
create or replace function public.submit_daily_duel_retry(
  p_challenge_type text,
  p_score integer,
  p_duration_ms integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_score integer := greatest(0, coalesce(p_score, 0));
  v_duel_id uuid;
  v_profile public.profiles%rowtype;
  v_entitlement record;
  v_played_today boolean;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  -- Verify Premium
  select * into v_entitlement from public.user_entitlements where user_id = v_uid;
  if not found or not v_entitlement.is_premium or v_entitlement.status != 'active' then
    return jsonb_build_object('success', false, 'reason', 'not_premium');
  end if;
  
  -- Verify they played normally today
  select exists(
    select 1 from public.duel_scores 
    where user_id = v_uid and duel_date = current_date and is_retry = false
  ) into v_played_today;

  if not v_played_today then
    return jsonb_build_object('success', false, 'reason', 'must_play_normal_first');
  end if;

  -- Insert retry score
  insert into public.duel_scores (user_id, duel_date, challenge_type, score, duration_ms, is_retry)
  values (v_uid, current_date, p_challenge_type, v_score, greatest(0, p_duration_ms), true)
  on conflict (user_id, duel_date, is_retry) do nothing
  returning id into v_duel_id;

  if v_duel_id is null then
    return jsonb_build_object('success', false, 'reason', 'retry_already_used');
  end if;

  update public.profiles
  set xp = xp + 25,
      coins = coins + 25,
      total_xp = total_xp + 25,
      best_duel_score = greatest(best_duel_score, v_score),
      total_duel_points = total_duel_points + v_score
  where id = v_uid
  returning * into v_profile;

  insert into public.gold_transactions (user_id, amount, transaction_type, reason)
  values (v_uid, 25, 'earn', 'Premium Duel Retry Reward');

  return jsonb_build_object(
    'success', true,
    'xp_earned', 25,
    'coins_earned', 25,
    'profile', to_jsonb(v_profile)
  );
end;
$$;

revoke all on function public.submit_daily_duel_retry(text, integer, integer) from public;
grant execute on function public.submit_daily_duel_retry(text, integer, integer) to authenticated;

-- get_my_duel_retry_status definition for Premium retry UI
create or replace function public.get_my_duel_retry_status(
  p_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ent record;
  v_has_played boolean;
  v_retry_used boolean;
begin
  if v_uid is null then
    return jsonb_build_object('success', false);
  end if;
  
  select * into v_ent from public.user_entitlements where user_id = v_uid;
  if not found or not v_ent.is_premium or v_ent.status != 'active' then
    return jsonb_build_object('success', true, 'is_premium', false);
  end if;

  select exists(select 1 from public.duel_scores where user_id = v_uid and duel_date = coalesce(p_date, current_date) and is_retry = false) into v_has_played;
  select exists(select 1 from public.duel_scores where user_id = v_uid and duel_date = coalesce(p_date, current_date) and is_retry = true) into v_retry_used;

  return jsonb_build_object(
    'success', true,
    'is_premium', true,
    'has_played_today', v_has_played,
    'retry_used', v_retry_used,
    'retry_available', (v_has_played and not v_retry_used)
  );
end;
$$;

revoke all on function public.get_my_duel_retry_status(date) from public;
grant execute on function public.get_my_duel_retry_status(date) to authenticated;

drop function if exists public.get_leaderboard(text, date, integer);

-- 5. Overhaul get_leaderboard for categories
create or replace function public.get_leaderboard(
  p_category text default 'duel_points',
  p_reference_date date default null, -- Kept for compatibility but ignored
  p_limit integer default 50
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  avatar text,
  score integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if p_category = 'duel_points' then
    return query
    select
      rank() over (order by p.total_duel_points desc) as rank,
      p.id as user_id,
      p.username,
      p.avatar,
      p.total_duel_points as score
    from public.profiles p
    where p.total_duel_points > 0
    order by p.total_duel_points desc, p.username asc
    limit v_limit;
  elsif p_category = 'gold' then
    return query
    select
      rank() over (order by p.coins desc) as rank,
      p.id as user_id,
      p.username,
      p.avatar,
      p.coins as score
    from public.profiles p
    order by p.coins desc, p.username asc
    limit v_limit;
  elsif p_category = 'xp' then
    return query
    select
      rank() over (order by p.xp desc) as rank,
      p.id as user_id,
      p.username,
      p.avatar,
      p.xp as score
    from public.profiles p
    where p.xp > 0
    order by p.xp desc, p.username asc
    limit v_limit;
  else
    return query select 1::bigint, null::uuid, ''::text, ''::text, 0::integer limit 0;
  end if;
end;
$$;

drop function if exists public.get_my_rank(text, date);

create or replace function public.get_my_rank(
  p_category text default 'duel_points',
  p_reference_date date default null -- Kept for compatibility but ignored
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_total integer;
  v_row record;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if p_category = 'duel_points' then
    select count(*) into v_total from public.profiles where total_duel_points > 0;
    
    with ranked as (
      select id, total_duel_points, rank() over (order by total_duel_points desc) as rank
      from public.profiles where total_duel_points > 0
    )
    select * into v_row from ranked where id = v_uid;

    if v_row is null then
      return jsonb_build_object('success', true, 'has_score', false, 'total_players', v_total);
    end if;

    return jsonb_build_object(
      'success', true,
      'has_score', true,
      'rank', v_row.rank,
      'score', v_row.total_duel_points,
      'total_players', v_total
    );

  elsif p_category = 'gold' then
    select count(*) into v_total from public.profiles;
    
    with ranked as (
      select id, coins, rank() over (order by coins desc) as rank
      from public.profiles
    )
    select * into v_row from ranked where id = v_uid;

    return jsonb_build_object(
      'success', true,
      'has_score', true,
      'rank', v_row.rank,
      'score', v_row.coins,
      'total_players', v_total
    );

  elsif p_category = 'xp' then
    select count(*) into v_total from public.profiles where xp > 0;
    
    with ranked as (
      select id, xp, rank() over (order by xp desc) as rank
      from public.profiles where xp > 0
    )
    select * into v_row from ranked where id = v_uid;

    if v_row is null then
      return jsonb_build_object('success', true, 'has_score', false, 'total_players', v_total);
    end if;

    return jsonb_build_object(
      'success', true,
      'has_score', true,
      'rank', v_row.rank,
      'score', v_row.xp,
      'total_players', v_total
    );
  end if;

  return jsonb_build_object('success', false, 'reason', 'invalid_category');
end;
$$;
