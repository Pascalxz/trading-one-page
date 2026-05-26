-- Liquidity Lens — Migration 0006
-- Alertes (règles) + événements déclenchés. User-scoped.

create type public.alert_kind as enum (
  'price_threshold',
  'pct_change',
  'macro_release',
  'event_proximity',
  'custom'
);

create table public.alerts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          public.alert_kind not null,
  label         text,
  symbol        text,                 -- optionnel : instrument concerné
  config        jsonb not null,       -- seuils, fenêtre, etc.
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index alerts_user_idx on public.alerts (user_id);

alter table public.alerts enable row level security;

create policy "alerts_crud_own"
  on public.alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger alerts_set_updated_at
  before update on public.alerts
  for each row execute function public.set_updated_at();

-- =======================
-- alert_events : déclenchements
-- =======================
create table public.alert_events (
  id           uuid primary key default uuid_generate_v4(),
  alert_id     uuid not null references public.alerts(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  triggered_at timestamptz not null default now(),
  context      jsonb not null,          -- snapshot du contexte au déclenchement
  message      text,                    -- texte IA enrichi (mode 2)
  is_read      boolean not null default false
);

create index alert_events_user_idx on public.alert_events (user_id, triggered_at desc);

alter table public.alert_events enable row level security;

create policy "alert_events_crud_own"
  on public.alert_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
