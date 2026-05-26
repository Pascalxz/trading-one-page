-- Liquidity Lens — Migration 0001
-- Profils utilisateur, thèmes de classification, trigger d'initialisation.

create extension if not exists "uuid-ossp";

-- =======================
-- profiles
-- =======================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  base_currency   text not null default 'CAD',
  timezone        text not null default 'America/Toronto',
  locale          text not null default 'fr',
  ai_token_budget int  not null default 200000,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- =======================
-- themes (par utilisateur, défauts seedés au signup)
-- =======================
create table public.themes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  slug        text not null,
  name        text not null,
  color       text not null default '#7dd3fc',
  is_default  boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, slug)
);

create index themes_user_idx on public.themes (user_id);

alter table public.themes enable row level security;

create policy "themes_crud_own"
  on public.themes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =======================
-- Trigger : à la création d'un user, créer le profil + seed des thèmes par défaut
-- =======================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.themes (user_id, slug, name, color, is_default, sort_order) values
    (new.id, 'mining-crypto',  'Mining crypto',     '#f59e0b', true, 10),
    (new.id, 'ai',             'IA',                '#a78bfa', true, 20),
    (new.id, 'crypto-etf',     'Crypto-ETF',        '#22d3ee', true, 30),
    (new.id, 'crypto-l1',      'Crypto L1/L2',      '#34d399', true, 40),
    (new.id, 'value-bluechip', 'Value / Blue chip', '#60a5fa', true, 50),
    (new.id, 'speculative',    'Spéculatif / penny','#fb7185', true, 60),
    (new.id, 'biotech',        'Biotech',           '#f472b6', true, 70),
    (new.id, 'space',          'Espace',            '#c084fc', true, 80),
    (new.id, 'cash',           'Liquidités',        '#94a3b8', true, 90),
    (new.id, 'other',          'Autre',             '#64748b', true, 999);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =======================
-- updated_at helper
-- =======================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
