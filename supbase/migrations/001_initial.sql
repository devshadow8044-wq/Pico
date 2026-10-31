-- PICOINVEST starter schema. Execute this file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text unique,
  country text,
  role text not null default 'member' check (role in ('member','admin')),
  balance bigint not null default 0 check (balance >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit','withdrawal')),
  amount bigint not null check (amount > 0),
  method text not null,
  reference text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  transaction_id uuid not null references public.transactions(id),
  action text not null,
  old_status text,
  new_status text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.phone,
    new.raw_user_meta_data->>'country'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profile owner can read" on public.profiles;
create policy "profile owner can read" on public.profiles
for select to authenticated using (auth.uid() = id);

drop policy if exists "member reads own transactions" on public.transactions;
create policy "member reads own transactions" on public.transactions
for select to authenticated using (auth.uid() = user_id);

-- Writes are performed only by the server API using the service-role key.
-- Never expose SUPABASE_SERVICE_ROLE_KEY in VITE_ variables.

create or replace function public.admin_review_transaction(
  p_transaction_id uuid,
  p_new_status text,
  p_admin_id uuid
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  tx public.transactions%rowtype;
begin
  if p_new_status not in ('approved','rejected') then
    raise exception 'Décision invalide';
  end if;
  if not exists (select 1 from public.profiles where id = p_admin_id and role = 'admin') then
    raise exception 'Accès administrateur refusé';
  end if;

  select * into tx from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if tx.status <> 'pending' then raise exception 'Cette demande a déjà été traitée'; end if;

  if p_new_status = 'approved' and tx.type = 'deposit' then
    update public.profiles set balance = balance + tx.amount where id = tx.user_id;
  elsif p_new_status = 'approved' and tx.type = 'withdrawal' then
    update public.profiles set balance = balance - tx.amount
    where id = tx.user_id and balance >= tx.amount;
    if not found then raise exception 'Solde insuffisant pour valider ce retrait'; end if;
  end if;

  update public.transactions
  set status = p_new_status, reviewed_by = p_admin_id, reviewed_at = now()
  where id = p_transaction_id;

  insert into public.audit_logs(admin_id, transaction_id, action, old_status, new_status)
  values (p_admin_id, p_transaction_id, 'review', tx.status, p_new_status);

  return jsonb_build_object('id', p_transaction_id, 'status', p_new_status);
end;
$$;

revoke all on function public.admin_review_transaction(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.admin_review_transaction(uuid,text,uuid) to service_role;

grant usage on schema public to authenticated;
grant select on public.profiles, public.transactions to authenticated;
