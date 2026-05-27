-- Liquidity Lens — Migration 0011
-- M2 global agrégé : 5 zones (US, EU, JP, CN, UK) converties en USD via FX
-- spot (FRED). Le calcul est exécuté après chaque cron macro.

-- 1) Séries M2/M3 nationales additionnelles (M3 OCDE pour les zones où M2
--    pur n'est pas publié sur FRED — c'est la convention "global liquidity"
--    couramment utilisée par les analystes macro).

insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('fred:MABMM301EZM189S', 'M3 zone euro',  'fred', 'Md EUR', 'monthly',
   '{"fred_id":"MABMM301EZM189S","currency":"EUR","role":"m2_component","region":"EZ"}'::jsonb),
  ('fred:MYAGM2JPM189N',   'M2 Japon',      'fred', 'Md JPY', 'monthly',
   '{"fred_id":"MYAGM2JPM189N","currency":"JPY","role":"m2_component","region":"JP"}'::jsonb),
  ('fred:MYAGM2CNM189N',   'M2 Chine',      'fred', 'Md CNY', 'monthly',
   '{"fred_id":"MYAGM2CNM189N","currency":"CNY","role":"m2_component","region":"CN"}'::jsonb),
  ('fred:MABMM301GBM189S', 'M3 Royaume-Uni','fred', 'Md GBP', 'monthly',
   '{"fred_id":"MABMM301GBM189S","currency":"GBP","role":"m2_component","region":"UK"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;

-- Compléter le M2SL existant avec son rôle pour l'agrégation
update public.macro_series
   set metadata = metadata || '{"currency":"USD","role":"m2_component","region":"US"}'::jsonb
 where key = 'fred:M2SL';

-- 2) Séries de taux de change FRED (USD-référence)
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('fred:DEXUSEU', 'USD per EUR (spot)', 'fred', 'USD', 'daily',
   '{"fred_id":"DEXUSEU","role":"fx","quote":"USD_per_EUR"}'::jsonb),
  ('fred:DEXJPUS', 'JPY per USD (spot)', 'fred', 'JPY', 'daily',
   '{"fred_id":"DEXJPUS","role":"fx","quote":"JPY_per_USD"}'::jsonb),
  ('fred:DEXCHUS', 'CNY per USD (spot)', 'fred', 'CNY', 'daily',
   '{"fred_id":"DEXCHUS","role":"fx","quote":"CNY_per_USD"}'::jsonb),
  ('fred:DEXUSUK', 'USD per GBP (spot)', 'fred', 'USD', 'daily',
   '{"fred_id":"DEXUSUK","role":"fx","quote":"USD_per_GBP"}'::jsonb)
on conflict (key) do nothing;

-- 3) Série dérivée : M2 global en trillions USD (computed, source = "derived")
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('derived:m2_global', 'M2 global (5 zones, USD live)', 'derived', 'T USD', 'monthly',
   '{"role":"m2_aggregate","components":["fred:M2SL","fred:MABMM301EZM189S","fred:MYAGM2JPM189N","fred:MYAGM2CNM189N","fred:MABMM301GBM189S"],"fx_method":"spot_live"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;
