-- Liquidity Lens — Migration 0002
-- Référentiel d'instruments (partagé entre tous les utilisateurs, lecture seule pour client).

create type public.instrument_kind as enum ('equity', 'etf', 'crypto', 'cash', 'option', 'other');

create table public.instruments (
  id              uuid primary key default uuid_generate_v4(),
  symbol          text not null unique,
  description     text,
  kind            public.instrument_kind not null default 'other',
  currency        text,
  sector          text,
  github_repo     text,            -- "org/repo" pour pilier C
  coingecko_id    text,            -- ex. "bitcoin"
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index instruments_kind_idx on public.instruments (kind);

alter table public.instruments enable row level security;

-- Lecture libre pour utilisateurs authentifiés (référentiel partagé).
create policy "instruments_read_authenticated"
  on public.instruments for select
  to authenticated
  using (true);

-- Aucune policy d'écriture : seul le service role (agents serveur) peut écrire.

create trigger instruments_set_updated_at
  before update on public.instruments
  for each row execute function public.set_updated_at();
