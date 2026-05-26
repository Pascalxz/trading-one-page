-- Liquidity Lens — Migration 0003
-- Comptes courtier et positions (holdings) — user-scoped.
-- Calculs monétaires : numeric, jamais float (PRD §7).

create table public.accounts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  external_id   text not null,      -- numéro de compte courtier
  broker        text not null default 'questrade',
  currency      text not null,
  label         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, external_id)
);

create index accounts_user_idx on public.accounts (user_id);

alter table public.accounts enable row level security;

create policy "accounts_crud_own"
  on public.accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- =======================
-- holdings : 1 ligne par position par compte
-- =======================
create table public.holdings (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  account_id               uuid not null references public.accounts(id) on delete cascade,
  instrument_id            uuid references public.instruments(id) on delete set null,
  symbol                   text not null,
  description              text,
  quantity                 numeric(28,8) not null default 0,
  avg_cost                 numeric(20,8),
  book_value               numeric(20,4),     -- valeur d'acquisition
  market_price             numeric(20,8),
  market_value             numeric(20,4),
  day_change_amount        numeric(20,4),
  day_change_pct           numeric(10,4),
  unrealized_pnl           numeric(20,4),
  unrealized_pnl_pct       numeric(10,4),
  accrued_interest         numeric(20,4),
  borrow_value             numeric(20,4),
  currency                 text,
  theme_id                 uuid references public.themes(id) on delete set null,
  is_zombie                boolean not null default false,
  source_row               jsonb,             -- ligne CSV brute pour audit
  imported_at              timestamptz,
  updated_at               timestamptz not null default now(),
  unique (account_id, symbol)
);

create index holdings_user_idx on public.holdings (user_id);
create index holdings_account_idx on public.holdings (account_id);
create index holdings_theme_idx on public.holdings (theme_id);

alter table public.holdings enable row level security;

create policy "holdings_crud_own"
  on public.holdings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger holdings_set_updated_at
  before update on public.holdings
  for each row execute function public.set_updated_at();

-- =======================
-- snapshots : fige l'état pour contexte IA et historique
-- =======================
create table public.snapshots (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  taken_at     timestamptz not null default now(),
  total_value  numeric(20,4),
  currency     text not null default 'CAD',
  payload      jsonb not null,    -- snapshot complet (holdings + macro + dev pertinents)
  created_at   timestamptz not null default now()
);

create index snapshots_user_taken_idx on public.snapshots (user_id, taken_at desc);

alter table public.snapshots enable row level security;

create policy "snapshots_crud_own"
  on public.snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
