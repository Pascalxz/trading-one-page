-- Liquidity Lens — Migration 0018
-- FRED a discontinué GOLDAMGBD228NLBM (London PM Gold Fix) en 2024.
-- Remplacement par PAXG-USDT (PAX Gold) sur OKX : token ERC-20 adossé 1:1
-- à de l'or physique en coffre LBMA. Le prix track le spot dans ~0.3%.
-- Avantages : OKX accessible depuis Vercel, ~4 ans d'historique daily,
-- pas de friction (vs Yahoo/Stooq géo-bloqués).

delete from public.macro_series where key = 'fred:GOLDAMGBD228NLBM';

insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('okx:gold',
   'Gold spot (PAXG-USDT, OKX)',
   'okx', 'USD/oz', 'daily',
   '{"okx_symbol":"PAXG-USDT","role":"price","proxy_note":"PAX Gold 1:1 backed, tracks LBMA spot ~0.3%"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;
