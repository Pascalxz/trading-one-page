-- Liquidity Lens — Migration 0014
-- Indicateurs dérivés : volatilité implicite, skew/put-call, crypto perpetuals, COT.

-- Volatilité implicite — VIX (FRED), MOVE (Stooq), DVOL Deribit
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('fred:VIXCLS',
   'VIX — S&P500 implied vol 30j',
   'fred', 'index', 'daily',
   '{"fred_id":"VIXCLS","role":"implied_vol","domain":"stocks"}'::jsonb),
  ('stooq:MOVE',
   'MOVE — Treasury implied vol (ICE BofA)',
   'stooq', 'index', 'daily',
   '{"stooq_symbol":"^move","role":"implied_vol","domain":"bonds"}'::jsonb),
  ('deribit:dvol_btc',
   'DVOL BTC — Deribit implied vol',
   'deribit', 'index', 'daily',
   '{"deribit_currency":"BTC","role":"implied_vol","domain":"crypto"}'::jsonb),
  ('deribit:dvol_eth',
   'DVOL ETH — Deribit implied vol',
   'deribit', 'index', 'daily',
   '{"deribit_currency":"ETH","role":"implied_vol","domain":"crypto"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;

-- Skew & put/call ratio CBOE
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('cboe:skew',
   'SKEW — tail risk S&P500',
   'cboe', 'index', 'daily',
   '{"cboe_symbol":"SKEW","role":"tail_risk"}'::jsonb),
  ('cboe:pcr_equity',
   'Put/Call ratio — equity',
   'cboe', 'ratio', 'daily',
   '{"cboe_symbol":"equitypc","role":"put_call"}'::jsonb),
  ('cboe:pcr_index',
   'Put/Call ratio — index',
   'cboe', 'ratio', 'daily',
   '{"cboe_symbol":"indexpc","role":"put_call"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;

-- Crypto perpetuals — funding rate (8h, on agrège en daily moyen) + open interest
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('bybit:funding_btc',
   'Funding rate BTC perpetual (Bybit)',
   'bybit', '% / 8h', 'daily',
   '{"bybit_symbol":"BTCUSDT","role":"funding"}'::jsonb),
  ('bybit:funding_eth',
   'Funding rate ETH perpetual (Bybit)',
   'bybit', '% / 8h', 'daily',
   '{"bybit_symbol":"ETHUSDT","role":"funding"}'::jsonb),
  ('bybit:oi_btc',
   'Open interest BTC perpetual (Bybit)',
   'bybit', 'BTC', 'daily',
   '{"bybit_symbol":"BTCUSDT","role":"open_interest"}'::jsonb),
  ('bybit:oi_eth',
   'Open interest ETH perpetual (Bybit)',
   'bybit', 'ETH', 'daily',
   '{"bybit_symbol":"ETHUSDT","role":"open_interest"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;

-- COT (CFTC) — positions nettes managed/leveraged money. Hebdomadaire (mardi).
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('cftc:cot_net_gold',
   'COT — Gold net (Managed Money)',
   'cftc', 'contrats', 'weekly',
   '{"market_name":"GOLD - COMMODITY EXCHANGE INC.","category":"M_Money","report":"disaggregated"}'::jsonb),
  ('cftc:cot_net_sp500',
   'COT — SP500 net (Leveraged Funds)',
   'cftc', 'contrats', 'weekly',
   '{"market_name":"E-MINI S&P 500 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE","category":"Lev_Money","report":"tff"}'::jsonb),
  ('cftc:cot_net_usd',
   'COT — USD Index net (Leveraged Funds)',
   'cftc', 'contrats', 'weekly',
   '{"market_name":"USD INDEX - ICE FUTURES U.S.","category":"Lev_Money","report":"tff"}'::jsonb),
  ('cftc:cot_net_t10',
   'COT — 10Y Treasury net (Leveraged Funds)',
   'cftc', 'contrats', 'weekly',
   '{"market_name":"UST 10Y NOTE - CHICAGO BOARD OF TRADE","category":"Lev_Money","report":"tff"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;
