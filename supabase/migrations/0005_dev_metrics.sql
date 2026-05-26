-- Liquidity Lens — Migration 0005
-- Métriques GitHub par instrument (partagées, lecture libre).

create table public.dev_metrics (
  instrument_id   uuid not null references public.instruments(id) on delete cascade,
  observed_on     date not null,
  commits_7d      int,
  commits_30d     int,
  contributors_30d int,
  stars           int,
  open_issues     int,
  last_release_at timestamptz,
  last_release_tag text,
  metadata        jsonb not null default '{}'::jsonb,
  inserted_at     timestamptz not null default now(),
  primary key (instrument_id, observed_on)
);

create index dev_metrics_instrument_idx on public.dev_metrics (instrument_id, observed_on desc);

alter table public.dev_metrics enable row level security;

create policy "dev_metrics_read_authenticated"
  on public.dev_metrics for select
  to authenticated using (true);
