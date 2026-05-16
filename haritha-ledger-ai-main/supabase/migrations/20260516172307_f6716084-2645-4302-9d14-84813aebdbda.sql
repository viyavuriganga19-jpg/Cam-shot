
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Shops (global reference)
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  name_te text,
  created_at timestamptz not null default now()
);
alter table public.shops enable row level security;
create policy "shops readable" on public.shops for select using (auth.uid() is not null);

insert into public.shops (code, name, name_te) values
  ('YR', 'YR Market', 'వై.ఆర్ మార్కెట్'),
  ('VZD', 'VZD Market', 'వి.జెడ్.డి మార్కెట్'),
  ('JLT', 'JLT Market', 'జె.ఎల్.టి మార్కెట్');

-- Bills
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id),
  bill_date date not null default current_date,
  image_url text,
  total_amount numeric(12,2) not null default 0,
  jama_amount numeric(12,2) not null default 0,
  old_balance numeric(12,2) not null default 0,
  new_balance numeric(12,2) not null default 0,
  status text not null default 'pending', -- paid | pending | partial
  items jsonb default '[]'::jsonb,
  notes text,
  ocr_raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bills enable row level security;
create policy "own bills all" on public.bills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index bills_user_date_idx on public.bills(user_id, bill_date desc);
create index bills_user_shop_idx on public.bills(user_id, shop_id);

-- Ledger entries (line items)
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_name text not null,
  quantity numeric(12,2),
  unit text,
  price numeric(12,2),
  amount numeric(12,2),
  created_at timestamptz not null default now()
);
alter table public.ledger_entries enable row level security;
create policy "own ledger all" on public.ledger_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Jama history
create table public.jama_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id),
  bill_id uuid references public.bills(id) on delete set null,
  amount numeric(12,2) not null,
  jama_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
alter table public.jama_history enable row level security;
create policy "own jama all" on public.jama_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index jama_user_date_idx on public.jama_history(user_id, jama_date desc);

-- Pending records
create table public.pending_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id),
  bill_id uuid references public.bills(id) on delete cascade,
  amount numeric(12,2) not null,
  due_date date,
  days_pending int default 0,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.pending_records enable row level security;
create policy "own pending all" on public.pending_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- jama_received | jama_missing | pending_alert
  title text not null,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "own notif all" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Settings
create table public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'te',
  voice_enabled boolean not null default true,
  theme text not null default 'green',
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
create policy "own settings all" on public.settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into public.settings (user_id) values (new.id);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket for bill images
insert into storage.buckets (id, name, public) values ('bills', 'bills', true)
on conflict (id) do nothing;

create policy "bills upload own" on storage.objects for insert
  with check (bucket_id = 'bills' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "bills read public" on storage.objects for select
  using (bucket_id = 'bills');
create policy "bills update own" on storage.objects for update
  using (bucket_id = 'bills' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "bills delete own" on storage.objects for delete
  using (bucket_id = 'bills' and auth.uid()::text = (storage.foldername(name))[1]);
