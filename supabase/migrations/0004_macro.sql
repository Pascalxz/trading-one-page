-- Liquidity Lens — Migration 0004
-- Séries macro (partagées) : M2 US, M2 global, CPI, taux Fed, etc.

create table public.macro_series (
  id          uuid primary key default uuid_generate_v4(),
  key         text not null unique,        -- ex. 'fred:M2SL', 'derived:m2_global'
  label       text not null,
  source      text not null,               -- 'fred', 'derived', etc.
  unit        text,
  frequency   text,                        -- 'monthly', 'daily'…
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.macro_series enable row level security;

create policy "macro_series_read_authenticated"
  on public.macro_series for select
  to authenticated using (true);

create trigger macro_series_set_updated_at
  before update on public.macro_series
  for each row execute function public.set_updated_at();

-- =======================
-- macro_points : points horodatés
-- =======================
create table public.macro_points (
  series_id   uuid not null references public.macro_series(id) on delete cascade,
  observed_at date not null,
  value       numeric(24,6) not null,
  inserted_at timestamptz not null default now(),
  primary key (series_id, observed_at)
);

create index macro_points_series_date_idx on public.macro_points (series_id, observed_at desc);

alter table public.macro_points enable row level security;

create policy "macro_points_read_authenticated"
  on public.macro_points for select
  to authenticated using (true);

-- =======================
-- macro_events : calendrier (FOMC, CPI release…)
-- =======================
create table public.macro_events (
  id          uuid primary key default uuid_generate_v4(),
  kind        text not null,         -- 'fomc', 'cpi_release', 'fed_minutes'…
  title       text not null,
  scheduled_at timestamptz not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index macro_events_scheduled_idx on public.macro_events (scheduled_at);

alter table public.macro_events enable row level security;

create policy "macro_events_read_authenticated"
  on public.macro_events for select
  to authenticated using (true);
