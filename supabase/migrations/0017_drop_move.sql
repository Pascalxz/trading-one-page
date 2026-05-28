-- Liquidity Lens — Migration 0017
-- Drop yahoo:MOVE : Yahoo géo-bloque les IP de datacenter Vercel (429
-- persistant même avec retry). Pas de source publique stable pour le MOVE
-- Index identifiée à ce stade. Couverture vol obligataire approximative
-- via T10Y2Y, DGS10, NFCI, COT net 10Y Treasury.

delete from public.macro_series where key = 'yahoo:MOVE';
