-- Liquidity Lens — Migration 0009
-- Seed des séries macro suivies et du calendrier FOMC/CPI 2026.

-- Séries macro (FRED)
insert into public.macro_series (key, label, source, unit, frequency, metadata) values
  ('fred:M2SL',     'M2 Money Stock (US)',                 'fred', 'Md $',    'monthly', '{"fred_id":"M2SL"}'::jsonb),
  ('fred:CPIAUCSL', 'CPI All Urban Consumers (US)',        'fred', 'Indice',  'monthly', '{"fred_id":"CPIAUCSL"}'::jsonb),
  ('fred:DFEDTARU', 'Fed Funds Target — Upper Limit',      'fred', '%',       'daily',   '{"fred_id":"DFEDTARU"}'::jsonb),
  ('fred:DFEDTARL', 'Fed Funds Target — Lower Limit',      'fred', '%',       'daily',   '{"fred_id":"DFEDTARL"}'::jsonb),
  ('fred:WALCL',    'Bilan Fed — total assets',            'fred', 'M $',     'weekly',  '{"fred_id":"WALCL"}'::jsonb)
on conflict (key) do nothing;

-- Calendrier FOMC 2026 (réunions confirmées par le Federal Reserve)
insert into public.macro_events (kind, title, scheduled_at, metadata) values
  ('fomc', 'FOMC — décision de taux (janvier)',  '2026-01-28 19:00:00+00', '{"day_count":2}'::jsonb),
  ('fomc', 'FOMC — décision de taux (mars, SEP)','2026-03-18 18:00:00+00', '{"day_count":2,"sep":true}'::jsonb),
  ('fomc', 'FOMC — décision de taux (avril/mai)','2026-04-29 18:00:00+00', '{"day_count":2}'::jsonb),
  ('fomc', 'FOMC — décision de taux (juin, SEP)','2026-06-17 18:00:00+00', '{"day_count":2,"sep":true}'::jsonb),
  ('fomc', 'FOMC — décision de taux (juillet)', '2026-07-29 18:00:00+00', '{"day_count":2}'::jsonb),
  ('fomc', 'FOMC — décision de taux (septembre, SEP)','2026-09-16 18:00:00+00', '{"day_count":2,"sep":true}'::jsonb),
  ('fomc', 'FOMC — décision de taux (octobre/novembre)','2026-10-28 18:00:00+00', '{"day_count":2}'::jsonb),
  ('fomc', 'FOMC — décision de taux (décembre, SEP)','2026-12-09 18:00:00+00', '{"day_count":2,"sep":true}'::jsonb)
on conflict do nothing;

-- Calendrier CPI 2026 (publications BLS — 13h30 UTC en général)
insert into public.macro_events (kind, title, scheduled_at, metadata) values
  ('cpi_release', 'CPI — publication (données décembre 2025)','2026-01-14 13:30:00+00', '{}'::jsonb),
  ('cpi_release', 'CPI — publication (données janvier)','2026-02-11 13:30:00+00', '{}'::jsonb),
  ('cpi_release', 'CPI — publication (données février)','2026-03-12 12:30:00+00', '{}'::jsonb),
  ('cpi_release', 'CPI — publication (données mars)','2026-04-15 12:30:00+00', '{}'::jsonb),
  ('cpi_release', 'CPI — publication (données avril)','2026-05-13 12:30:00+00', '{}'::jsonb),
  ('cpi_release', 'CPI — publication (données mai)','2026-06-11 12:30:00+00', '{}'::jsonb),
  ('cpi_release', 'CPI — publication (données juin)','2026-07-15 12:30:00+00', '{}'::jsonb),
  ('cpi_release', 'CPI — publication (données juillet)','2026-08-12 12:30:00+00', '{}'::jsonb),
  ('cpi_release', 'CPI — publication (données août)','2026-09-10 12:30:00+00', '{}'::jsonb),
  ('cpi_release', 'CPI — publication (données septembre)','2026-10-15 12:30:00+00', '{}'::jsonb),
  ('cpi_release', 'CPI — publication (données octobre)','2026-11-13 13:30:00+00', '{}'::jsonb),
  ('cpi_release', 'CPI — publication (données novembre)','2026-12-10 13:30:00+00', '{}'::jsonb)
on conflict do nothing;
