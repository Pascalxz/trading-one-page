-- Liquidity Lens — Migration 0007
-- Briefings quotidiens + journal des appels IA. User-scoped.

create table public.briefings (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  for_date      date not null,
  content       text not null,         -- texte rédigé (mode 1)
  snapshot_id   uuid references public.snapshots(id) on delete set null,
  model         text,
  tokens_in     int,
  tokens_out    int,
  cost_usd      numeric(12,6),
  created_at    timestamptz not null default now(),
  unique (user_id, for_date)
);

create index briefings_user_date_idx on public.briefings (user_id, for_date desc);

alter table public.briefings enable row level security;

create policy "briefings_crud_own"
  on public.briefings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =======================
-- ai_runs : journal détaillé pour plafond + observabilité (PRD §6.4)
-- =======================
create table public.ai_runs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  mode        text not null,           -- 'briefing' | 'alert' | 'analysis' | 'agent'
  model       text not null,
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  cost_usd    numeric(12,6),
  duration_ms int,
  status      text not null default 'ok',  -- 'ok' | 'error' | 'truncated'
  error       text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index ai_runs_user_created_idx on public.ai_runs (user_id, created_at desc);
create index ai_runs_user_day_idx on public.ai_runs (user_id, ((created_at at time zone 'UTC')::date));

alter table public.ai_runs enable row level security;

create policy "ai_runs_select_own"
  on public.ai_runs for select
  using (auth.uid() = user_id);

-- Les insertions IA passent par le service role côté serveur — pas de policy d'insert pour les users.
