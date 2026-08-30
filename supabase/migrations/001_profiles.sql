create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(trim(username)) between 1 and 20),
  avatar text,
  xp integer not null default 0 check (xp >= 0),
  coins integer not null default 100 check (coins >= 0),
  streak integer not null default 0 check (streak >= 0),
  total_quests_completed integer not null default 0 check (total_quests_completed >= 0),
  total_xp integer not null default 0 check (total_xp >= 0),
  best_duel_score integer not null default 0 check (best_duel_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Profiles are selectable by owner" on public.profiles;
create policy "Profiles are selectable by owner"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Profiles are deletable by owner" on public.profiles;
create policy "Profiles are deletable by owner"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    avatar,
    xp,
    coins,
    streak,
    total_quests_completed,
    total_xp,
    best_duel_score
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1), 'Player'),
    nullif(trim(new.raw_user_meta_data->>'avatar'), ''),
    0,
    100,
    0,
    0,
    0,
    0
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
after insert on auth.users
for each row
execute function public.create_profile_for_new_user();
