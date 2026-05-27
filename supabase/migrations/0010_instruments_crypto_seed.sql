-- Liquidity Lens — Migration 0010
-- Seed des protocoles crypto suivis : prix CoinGecko + activité dev GitHub.

insert into public.instruments (symbol, description, kind, currency, github_repo, coingecko_id, metadata) values
  ('BTC',  'Bitcoin',         'crypto', 'USD', 'bitcoin/bitcoin',          'bitcoin',     '{"protocol":"bitcoin"}'::jsonb),
  ('ETH',  'Ethereum',        'crypto', 'USD', 'ethereum/go-ethereum',     'ethereum',    '{"protocol":"ethereum"}'::jsonb),
  ('SOL',  'Solana',          'crypto', 'USD', 'anza-xyz/agave',           'solana',      '{"protocol":"solana"}'::jsonb),
  ('AVAX', 'Avalanche',       'crypto', 'USD', 'ava-labs/avalanchego',     'avalanche-2', '{"protocol":"avalanche"}'::jsonb),
  ('DOT',  'Polkadot',        'crypto', 'USD', 'paritytech/polkadot-sdk',  'polkadot',    '{"protocol":"polkadot"}'::jsonb)
on conflict (symbol) do update set
  description  = excluded.description,
  kind         = excluded.kind,
  currency     = excluded.currency,
  github_repo  = excluded.github_repo,
  coingecko_id = excluded.coingecko_id,
  metadata     = excluded.metadata;
