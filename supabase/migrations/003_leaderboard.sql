-- Global leaderboard read path.
--
-- duel_scores and profiles remain owner-only via their existing RLS
-- policies (see 001_profiles.sql and 002_game_data.sql). Instead of
-- adding a broad SELECT policy that would expose every user's rows to
-- every other user, we expose two narrow SECURITY DEFINER functions
-- that return only the aggregated, non-sensitive fields a leaderboard
-- needs (rank, username, avatar, score, duel date, challenge type).
-- Email addresses and any other profile columns are never selected or
-- returned by these functions.

create or replace function public.get_leaderboard(
  p_period text default 'today',
  p_reference_date date default null,
  p_limit integer default 50
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  avatar text,
  score integer,
  duel_date date,
  challenge_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref date := coalesce(p_reference_date, current_date);
  v_start date;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if p_period = 'weekly' then
    v_start := v_ref - interval '6 days';
  elsif p_period = 'today' then
    v_start := v_ref;
  else
    v_start := date '1970-01-01';
  end if;

  return query
  with scoped as (
    select
      ds.user_id,
      ds.score,
      ds.duel_date,
      ds.challenge_type,
      row_number() over (
        partition by ds.user_id
        order by ds.score desc, ds.duel_date asc
      ) as rn
    from public.duel_scores ds
    where ds.duel_date between v_start and v_ref
  ),
  best as (
    select scoped.user_id, scoped.score, scoped.duel_date, scoped.challenge_type
    from scoped
    where scoped.rn = 1
  )
  select
    rank() over (order by best.score desc) as rank,
    best.user_id,
    p.username,
    p.avatar,
    best.score,
    best.duel_date,
    best.challenge_type
  from best
  join public.profiles p on p.id = best.user_id
  order by best.score desc, best.duel_date asc, p.username asc
  limit v_limit;
end;
$$;

revoke all on function public.get_leaderboard(text, date, integer) from public;
grant execute on function public.get_leaderboard(text, date, integer) to anon, authenticated;

create or replace function public.get_my_rank(
  p_period text default 'today',
  p_reference_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ref date := coalesce(p_reference_date, current_date);
  v_start date;
  v_total integer;
  v_row record;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if p_period = 'weekly' then
    v_start := v_ref - interval '6 days';
  elsif p_period = 'today' then
    v_start := v_ref;
  else
    v_start := date '1970-01-01';
  end if;

  with scoped as (
    select
      ds.user_id,
      ds.score,
      ds.duel_date,
      ds.challenge_type,
      row_number() over (
        partition by ds.user_id
        order by ds.score desc, ds.duel_date asc
      ) as rn
    from public.duel_scores ds
    where ds.duel_date between v_start and v_ref
  ),
  best as (
    select scoped.user_id, scoped.score, scoped.duel_date, scoped.challenge_type
    from scoped
    where scoped.rn = 1
  ),
  ranked as (
    select
      best.user_id,
      best.score,
      best.duel_date,
      best.challenge_type,
      rank() over (order by best.score desc) as rank
    from best
  )
  select count(*) into v_total from best;

  select * into v_row from ranked where ranked.user_id = v_uid;

  if v_row is null then
    return jsonb_build_object(
      'success', true,
      'has_score', false,
      'total_players', v_total
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'has_score', true,
    'rank', v_row.rank,
    'score', v_row.score,
    'duel_date', v_row.duel_date,
    'challenge_type', v_row.challenge_type,
    'total_players', v_total
  );
end;
$$;

revoke all on function public.get_my_rank(text, date) from public;
grant execute on function public.get_my_rank(text, date) to authenticated;
