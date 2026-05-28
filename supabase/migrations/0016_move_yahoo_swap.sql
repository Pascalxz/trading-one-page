-- Liquidity Lens — Migration 0016
-- Stooq bloque les IP de datacenter Vercel → switch MOVE vers Yahoo Finance.

delete from public.macro_series where key = 'stooq:MOVE';

insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('yahoo:MOVE',
   'MOVE — Treasury implied vol (ICE BofA)',
   'yahoo', 'index', 'daily',
   '{"yahoo_symbol":"^MOVE","role":"implied_vol","domain":"bonds"}'::jsonb)
on conflict (key) do update set metadata = excluded.metadata;
