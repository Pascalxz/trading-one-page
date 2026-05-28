-- Liquidity Lens — Migration 0015
-- Bybit géo-bloque les IP de datacenter US (Vercel) → switch vers OKX.
-- CBOE put/call : pas de CSV public stable → on retire ces 2 séries.

-- Nettoyage : retirer les séries Bybit (géo-bloquées) et CBOE PCR (non publiques)
delete from public.macro_series where key in (
  'bybit:funding_btc',
  'bybit:funding_eth',
  'bybit:oi_btc',
  'bybit:oi_eth',
  'cboe:pcr_equity',
  'cboe:pcr_index'
);

-- Remplacement : OKX (accessible depuis IP US, public REST v5)
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('okx:funding_btc',
   'Funding rate BTC perpetual (OKX)',
   'okx', '% / 8h', 'daily',
   '{"okx_symbol":"BTC-USDT-SWAP","role":"funding"}'::jsonb),
  ('okx:funding_eth',
   'Funding rate ETH perpetual (OKX)',
   'okx', '% / 8h', 'daily',
   '{"okx_symbol":"ETH-USDT-SWAP","role":"funding"}'::jsonb),
  ('okx:oi_btc',
   'Open interest BTC perpetual (OKX)',
   'okx', 'USD', 'daily',
   '{"okx_ccy":"BTC","role":"open_interest"}'::jsonb),
  ('okx:oi_eth',
   'Open interest ETH perpetual (OKX)',
   'okx', 'USD', 'daily',
   '{"okx_ccy":"ETH","role":"open_interest"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;
