create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_premium boolean not null default false,
  plan text not null default 'free',
  status text not null default 'expired',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_entitlements_user_id_key unique (user_id)
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null,
  amount integer not null,
  utr text not null,
  screenshot_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

alter table public.user_entitlements enable row level security;
alter table public.payment_requests enable row level security;

-- Policies for entitlements (only owner can read)
drop policy if exists "Entitlements are selectable by owner" on public.user_entitlements;
create policy "Entitlements are selectable by owner"
on public.user_entitlements for select to authenticated using (auth.uid() = user_id);

-- Policies for payment_requests (owner can insert/read, admin can read/update)
drop policy if exists "Payments selectable by owner or admin" on public.payment_requests;
create policy "Payments selectable by owner or admin"
on public.payment_requests for select to authenticated
using (auth.uid() = user_id or auth.uid() = 'b3b8976d-82e1-43b6-bbdf-00d7b8c82f7e');

drop policy if exists "Payments insertable by owner" on public.payment_requests;
create policy "Payments insertable by owner"
on public.payment_requests for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Payments updatable by admin" on public.payment_requests;
create policy "Payments updatable by admin"
on public.payment_requests for update to authenticated
using (auth.uid() = 'b3b8976d-82e1-43b6-bbdf-00d7b8c82f7e')
with check (auth.uid() = 'b3b8976d-82e1-43b6-bbdf-00d7b8c82f7e');

-- RPC get_my_entitlement
create or replace function public.get_my_entitlement()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ent record;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'not_authenticated'); end if;
  
  select * into v_ent from public.user_entitlements where user_id = v_uid;
  if not found then
    return jsonb_build_object('success', true, 'is_premium', false, 'plan', 'free', 'status', 'expired');
  end if;

  -- Auto-expire
  if v_ent.expires_at < now() and v_ent.is_premium then
    update public.user_entitlements set is_premium = false, status = 'expired', updated_at = now() where user_id = v_uid;
    v_ent.is_premium := false;
    v_ent.status := 'expired';
  end if;

  return jsonb_build_object(
    'success', true,
    'is_premium', v_ent.is_premium,
    'plan', v_ent.plan,
    'status', v_ent.status,
    'expires_at', v_ent.expires_at
  );
end;
$$;

revoke all on function public.get_my_entitlement() from public;
grant execute on function public.get_my_entitlement() to authenticated;

-- RPC approve_payment_request
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

  insert into public.user_entitlements (user_id, is_premium, plan, status, expires_at, updated_at)
  values (v_payment.user_id, true, v_payment.plan, 'active', now() + (v_months || ' months')::interval, now())
  on conflict (user_id) do update set
    is_premium = true,
    plan = excluded.plan,
    status = 'active',
    expires_at = greatest(coalesce(public.user_entitlements.expires_at, now()), now()) + (v_months || ' months')::interval,
    updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.approve_payment_request(uuid) from public;
grant execute on function public.approve_payment_request(uuid) to authenticated;

-- RPC reject_payment_request
create or replace function public.reject_payment_request(p_payment_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_payment record;
begin
  if v_uid != 'b3b8976d-82e1-43b6-bbdf-00d7b8c82f7e' then
    return jsonb_build_object('success', false, 'reason', 'unauthorized');
  end if;

  select * into v_payment from public.payment_requests where id = p_payment_request_id for update;
  if not found then return jsonb_build_object('success', false, 'reason', 'not_found'); end if;
  if v_payment.status != 'pending' then return jsonb_build_object('success', false, 'reason', 'not_pending'); end if;

  update public.payment_requests 
  set status = 'rejected', reviewed_at = now(), reviewed_by = v_uid
  where id = p_payment_request_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.reject_payment_request(uuid) from public;
grant execute on function public.reject_payment_request(uuid) to authenticated;

-- Storage buckets
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('payment-screenshots', 'payment-screenshots', false) on conflict (id) do nothing;

drop policy if exists "Avatars are publicly accessible" on storage.objects;
create policy "Avatars are publicly accessible" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload avatars" on storage.objects;
create policy "Users can upload avatars" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update avatars" on storage.objects;
create policy "Users can update avatars" on storage.objects for update to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete avatars" on storage.objects;
create policy "Users can delete avatars" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Payments screenshots viewable by owner/admin" on storage.objects;
create policy "Payments screenshots viewable by owner/admin" on storage.objects for select to authenticated using (bucket_id = 'payment-screenshots' and ((storage.foldername(name))[1] = auth.uid()::text or auth.uid() = 'b3b8976d-82e1-43b6-bbdf-00d7b8c82f7e'));

drop policy if exists "Users can upload screenshots" on storage.objects;
create policy "Users can upload screenshots" on storage.objects for insert to authenticated with check (bucket_id = 'payment-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete screenshots" on storage.objects;
create policy "Users can delete screenshots" on storage.objects for delete to authenticated using (bucket_id = 'payment-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
