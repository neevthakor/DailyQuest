alter table public.profiles
add column if not exists last_streak_date date;

create table if not exists public.daily_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_date date not null,
  title text not null,
  description text,
  category text,
  difficulty text,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  coin_reward integer not null default 0 check (coin_reward >= 0),
  icon text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint daily_quests_completed_at_check check (
    (completed = false and completed_at is null) or
    (completed = true and completed_at is not null)
  ),
  constraint daily_quests_unique_generated unique (user_id, quest_date, title)
);

create index if not exists daily_quests_user_date_idx
on public.daily_quests (user_id, quest_date);

create index if not exists daily_quests_user_completed_idx
on public.daily_quests (user_id, completed);

create table if not exists public.quest_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.daily_quests(id) on delete cascade,
  completed_at timestamptz not null default now(),
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  coins_awarded integer not null default 0 check (coins_awarded >= 0),
  constraint quest_completions_unique_reward unique (user_id, quest_id)
);

create index if not exists quest_completions_user_completed_at_idx
on public.quest_completions (user_id, completed_at desc);

create index if not exists quest_completions_quest_idx
on public.quest_completions (quest_id);

create table if not exists public.duel_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duel_date date not null,
  challenge_type text not null,
  score integer not null default 0 check (score >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  completed_at timestamptz not null default now(),
  constraint duel_scores_one_per_day unique (user_id, duel_date)
);

create index if not exists duel_scores_user_date_idx
on public.duel_scores (user_id, duel_date desc);

create index if not exists duel_scores_leaderboard_idx
on public.duel_scores (duel_date desc, score desc);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  constraint user_achievements_unique_unlock unique (user_id, achievement_id)
);

create index if not exists user_achievements_user_idx
on public.user_achievements (user_id, unlocked_at desc);

alter table public.daily_quests enable row level security;
alter table public.quest_completions enable row level security;
alter table public.duel_scores enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists "Daily quests are selectable by owner" on public.daily_quests;
create policy "Daily quests are selectable by owner"
on public.daily_quests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Daily quests are insertable by owner" on public.daily_quests;
create policy "Daily quests are insertable by owner"
on public.daily_quests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Daily quests are updatable by owner" on public.daily_quests;
create policy "Daily quests are updatable by owner"
on public.daily_quests
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Daily quests are deletable by owner" on public.daily_quests;
create policy "Daily quests are deletable by owner"
on public.daily_quests
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Quest completions are selectable by owner" on public.quest_completions;
create policy "Quest completions are selectable by owner"
on public.quest_completions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Quest completions are insertable by owner" on public.quest_completions;
create policy "Quest completions are insertable by owner"
on public.quest_completions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Quest completions are updatable by owner" on public.quest_completions;
create policy "Quest completions are updatable by owner"
on public.quest_completions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Quest completions are deletable by owner" on public.quest_completions;
create policy "Quest completions are deletable by owner"
on public.quest_completions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Duel scores are selectable by owner" on public.duel_scores;
create policy "Duel scores are selectable by owner"
on public.duel_scores
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Duel scores are insertable by owner" on public.duel_scores;
create policy "Duel scores are insertable by owner"
on public.duel_scores
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Duel scores are updatable by owner" on public.duel_scores;
create policy "Duel scores are updatable by owner"
on public.duel_scores
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Duel scores are deletable by owner" on public.duel_scores;
create policy "Duel scores are deletable by owner"
on public.duel_scores
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Achievements are selectable by owner" on public.user_achievements;
create policy "Achievements are selectable by owner"
on public.user_achievements
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Achievements are insertable by owner" on public.user_achievements;
create policy "Achievements are insertable by owner"
on public.user_achievements
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Achievements are updatable by owner" on public.user_achievements;
create policy "Achievements are updatable by owner"
on public.user_achievements
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Achievements are deletable by owner" on public.user_achievements;
create policy "Achievements are deletable by owner"
on public.user_achievements
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.complete_daily_quest(p_quest_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_uid uuid := auth.uid();
  v_quest public.daily_quests%rowtype;
  v_completion_id uuid;
  v_completed_today integer;
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  select *
  into v_quest
  from public.daily_quests
  where id = p_quest_id
    and user_id = v_uid
  for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'missing');
  end if;

  if v_quest.completed then
    return jsonb_build_object('success', false, 'reason', 'already_completed');
  end if;

  insert into public.quest_completions (user_id, quest_id, xp_awarded, coins_awarded)
  values (v_uid, v_quest.id, v_quest.xp_reward, v_quest.coin_reward)
  on conflict (user_id, quest_id) do nothing
  returning id into v_completion_id;

  if v_completion_id is null then
    return jsonb_build_object('success', false, 'reason', 'already_completed');
  end if;

  update public.daily_quests
  set completed = true,
      completed_at = now()
  where id = v_quest.id
    and user_id = v_uid;

  select count(*)
  into v_completed_today
  from public.daily_quests
  where user_id = v_uid
    and quest_date = v_quest.quest_date
    and completed = true;

  update public.profiles
  set xp = xp + v_quest.xp_reward,
      coins = coins + v_quest.coin_reward,
      total_quests_completed = total_quests_completed + 1,
      total_xp = total_xp + v_quest.xp_reward,
      streak = case
        when v_completed_today < 3 then streak
        when last_streak_date = v_quest.quest_date then streak
        when last_streak_date = v_quest.quest_date - 1 then streak + 1
        else 1
      end,
      last_streak_date = case
        when v_completed_today >= 3 then v_quest.quest_date
        else last_streak_date
      end
  where id = v_uid
  returning * into v_profile;

  if v_quest.coin_reward > 0 then
    insert into public.gold_transactions (user_id, amount, transaction_type, reason)
    values (v_uid, v_quest.coin_reward, 'earn', 'Daily Quest Reward');
  end if;

  return jsonb_build_object(
    'success', true,
    'xp_awarded', v_quest.xp_reward,
    'coins_awarded', v_quest.coin_reward,
    'profile', to_jsonb(v_profile)
  );
end;
$$;

create or replace function public.submit_daily_duel(
  p_duel_date date,
  p_challenge_type text,
  p_score integer,
  p_duration_ms integer default null
)
returns jsonb
language plpgsql
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

  insert into public.duel_scores (user_id, duel_date, challenge_type, score, duration_ms)
  values (v_uid, p_duel_date, p_challenge_type, v_score, greatest(0, p_duration_ms))
  on conflict (user_id, duel_date) do nothing
  returning id into v_duel_id;

  if v_duel_id is null then
    return jsonb_build_object('success', false, 'reason', 'already_played');
  end if;

  update public.profiles
  set xp = xp + 50,
      coins = coins + 50,
      total_xp = total_xp + 50,
      best_duel_score = greatest(best_duel_score, v_score)
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

revoke all on function public.complete_daily_quest(uuid) from public;
grant execute on function public.complete_daily_quest(uuid) to authenticated;

revoke all on function public.submit_daily_duel(date, text, integer, integer) from public;
grant execute on function public.submit_daily_duel(date, text, integer, integer) to authenticated;
