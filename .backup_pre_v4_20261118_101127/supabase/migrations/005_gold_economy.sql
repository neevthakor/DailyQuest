create table if not exists public.economy_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.economy_config (key, value) values
  ('change_username', '10000'),
  ('change_avatar', '5000'),
  ('join_group', '1000'),
  ('premium_14_days', '50000')
on conflict (key) do nothing;

create table if not exists public.gold_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  transaction_type text not null check (transaction_type in ('earn', 'spend')),
  reason text not null,
  reference_id text,
  created_at timestamptz not null default now()
);

alter table public.economy_config enable row level security;
alter table public.gold_transactions enable row level security;

drop policy if exists "Economy config readable by all" on public.economy_config;
create policy "Economy config readable by all" on public.economy_config for select to authenticated using (true);

drop policy if exists "Transactions readable by owner" on public.gold_transactions;
create policy "Transactions readable by owner" on public.gold_transactions for select to authenticated using (auth.uid() = user_id);

create or replace function public.purchase_item(p_item_id text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cost integer;
  v_profile record;
  v_entitlement record;
  v_is_premium boolean := false;
  v_final_cost integer;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'not_authenticated'); end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then return jsonb_build_object('success', false, 'reason', 'profile_not_found'); end if;

  select * into v_entitlement from public.user_entitlements where user_id = v_uid and is_premium = true and expires_at > now();
  if found then v_is_premium := true; end if;

  select (value#>>'{}')::integer into v_cost from public.economy_config where key = p_item_id;
  if not found then return jsonb_build_object('success', false, 'reason', 'invalid_item'); end if;

  v_final_cost := v_cost;

  if p_item_id = 'change_username' then
    if v_is_premium then
      v_final_cost := 0;
    end if;

    if v_profile.coins < v_final_cost then return jsonb_build_object('success', false, 'reason', 'insufficient_funds'); end if;

    if p_payload->>'new_username' is null or length(trim(p_payload->>'new_username')) < 1 or length(trim(p_payload->>'new_username')) > 20 then
      return jsonb_build_object('success', false, 'reason', 'invalid_username');
    end if;

    update public.profiles set username = trim(p_payload->>'new_username'), coins = coins - v_final_cost where id = v_uid;
    
    insert into public.gold_transactions (user_id, amount, transaction_type, reason) 
    values (v_uid, -v_final_cost, 'spend', 'Change Username');
    
  elsif p_item_id = 'change_avatar' then
    if v_profile.coins < v_final_cost then return jsonb_build_object('success', false, 'reason', 'insufficient_funds'); end if;
    
    update public.profiles set avatar = trim(p_payload->>'new_avatar'), coins = coins - v_final_cost where id = v_uid;
    
    insert into public.gold_transactions (user_id, amount, transaction_type, reason) 
    values (v_uid, -v_final_cost, 'spend', 'Change Avatar');

  elsif p_item_id = 'join_group' then
    if v_profile.coins < v_final_cost then return jsonb_build_object('success', false, 'reason', 'insufficient_funds'); end if;
    
    begin
      insert into public.group_members (user_id, group_id) values (v_uid, (p_payload->>'group_id')::uuid);
    exception when unique_violation then
      return jsonb_build_object('success', false, 'reason', 'already_joined');
    end;

    update public.profiles set coins = coins - v_final_cost where id = v_uid;
    
    insert into public.gold_transactions (user_id, amount, transaction_type, reason) 
    values (v_uid, -v_final_cost, 'spend', 'Join Group');

  elsif p_item_id = 'premium_14_days' then
    if v_profile.coins < v_final_cost then return jsonb_build_object('success', false, 'reason', 'insufficient_funds'); end if;

    insert into public.user_entitlements (user_id, is_premium, plan, status, expires_at, updated_at)
    values (v_uid, true, 'gold_14_days', 'active', now() + '14 days'::interval, now())
    on conflict (user_id) do update set
      is_premium = true,
      status = 'active',
      expires_at = greatest(coalesce(public.user_entitlements.expires_at, now()), now()) + '14 days'::interval,
      updated_at = now();

    update public.profiles set coins = coins - v_final_cost where id = v_uid;
    
    insert into public.gold_transactions (user_id, amount, transaction_type, reason) 
    values (v_uid, -v_final_cost, 'spend', 'Premium 14 Days');

  else
    return jsonb_build_object('success', false, 'reason', 'unknown_item');
  end if;

  return jsonb_build_object('success', true, 'remaining_gold', v_profile.coins - v_final_cost);
end;
$$;

revoke all on function public.purchase_item(text, jsonb) from public;
grant execute on function public.purchase_item(text, jsonb) to authenticated;
