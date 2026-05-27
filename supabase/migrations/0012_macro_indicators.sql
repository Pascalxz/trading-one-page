-- Liquidity Lens — Migration 0012
-- Indicateurs économiques additionnels (V1.2)
-- 4 groupes : liquidité Fed (RRP, TGA, Net Liquidity dérivée), taux longs et
-- courbe, dollar et or, et conditions financières (NFCI).

-- 1) Liquidité Fed — ON-RRP (drainage daily) + TGA (compte Trésor à la Fed)
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('fred:RRPONTSYD',
   'ON-RRP — Reverse Repo (drainage)',
   'fred', 'Md $', 'daily',
   '{"fred_id":"RRPONTSYD","role":"liquidity","sign":"drain"}'::jsonb),
  ('fred:WTREGEN',
   'TGA — Treasury General Account',
   'fred', 'Md $', 'weekly',
   '{"fred_id":"WTREGEN","role":"liquidity","sign":"drain"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;

-- Net Liquidity = WALCL − TGA − RRP (dérivée, hebdomadaire)
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('derived:net_liquidity',
   'Net Liquidity (WALCL − TGA − RRP)',
   'derived', 'Md $', 'weekly',
   '{"role":"liquidity_aggregate","components":["fred:WALCL","fred:WTREGEN","fred:RRPONTSYD"]}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;

-- 2) Taux longs & courbe
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('fred:DGS10',
   'US 10 ans — taux Trésor',
   'fred', '%', 'daily',
   '{"fred_id":"DGS10","role":"rates"}'::jsonb),
  ('fred:DGS2',
   'US 2 ans — taux Trésor',
   'fred', '%', 'daily',
   '{"fred_id":"DGS2","role":"rates"}'::jsonb),
  ('fred:T10Y2Y',
   'Spread 10Y−2Y (récession si < 0)',
   'fred', '%', 'daily',
   '{"fred_id":"T10Y2Y","role":"yield_curve"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;

-- 3) Dollar (DTWEXBGS = nominal broad USD index, base 2006=100) et or (LBMA)
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('fred:DTWEXBGS',
   'USD broad index (nominal)',
   'fred', 'index', 'daily',
   '{"fred_id":"DTWEXBGS","role":"fx_strength"}'::jsonb),
  ('fred:GOLDAMGBD228NLBM',
   'Or — LBMA AM fix (USD/oz)',
   'fred', 'USD/oz', 'daily',
   '{"fred_id":"GOLDAMGBD228NLBM","role":"refuge"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;

-- 4) Conditions financières — NFCI (Chicago Fed). >0 = plus serré que moyenne.
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('fred:NFCI',
   'NFCI — conditions financières (Chicago Fed)',
   'fred', 'index', 'weekly',
   '{"fred_id":"NFCI","role":"financial_conditions"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;
