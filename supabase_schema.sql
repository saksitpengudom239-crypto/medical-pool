-- Enable needed extensions
create extension if not exists "pgcrypto";

-- Lookup tables
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);
create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- Assets
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_id text,
  id_code text,
  name text,
  brand text,
  model text,
  vendor text,
  serial text,
  department text,
  location text,
  purchase_date date,
  price text
);

-- Borrows
create table if not exists public.borrows (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  borrower_name text,
  borrower_dept text,
  lender_name text,
  peripherals text,
  start_date date,
  end_date date,
  returned boolean default false,
  borrower_signature text
);

-- RLS
alter table public.brands enable row level security;
alter table public.models enable row level security;
alter table public.vendors enable row level security;
alter table public.departments enable row level security;
alter table public.locations enable row level security;
alter table public.assets enable row level security;
alter table public.borrows enable row level security;

-- Policies: allow authenticated users full access (adjust as needed)
do $$
declare t text;
begin
  for t in select 'public.' || tbl from (values
    ('brands'),('models'),('vendors'),('departments'),('locations'),('assets'),('borrows')
  ) s(tbl)
  loop
    execute format('create policy if not exists %I on %s for select to authenticated using (true);', 'p_select_'||t, t);
    execute format('create policy if not exists %I on %s for insert to authenticated with check (true);', 'p_insert_'||t, t);
    execute format('create policy if not exists %I on %s for update to authenticated using (true) with check (true);', 'p_update_'||t, t);
    execute format('create policy if not exists %I on %s for delete to authenticated using (true);', 'p_delete_'||t, t);
  end loop;
end $$;
