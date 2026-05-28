-- Liquidity Lens — Migration 0013
-- Indices Fear & Greed pour la crypto (alternative.me) et la bourse (CNN).
-- Sentiment market 0-100 : 0 = extreme fear, 100 = extreme greed.

insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('altme:fng_crypto',
   'Fear & Greed — crypto (alternative.me)',
   'alternative_me', 'index 0-100', 'daily',
   '{"role":"sentiment","domain":"crypto","scale":{"min":0,"max":100}}'::jsonb),
  ('cnn:fng_stocks',
   'Fear & Greed — bourse (CNN)',
   'cnn', 'index 0-100', 'daily',
   '{"role":"sentiment","domain":"stocks","scale":{"min":0,"max":100}}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;
