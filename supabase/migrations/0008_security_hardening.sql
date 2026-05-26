-- Liquidity Lens — Migration 0008
-- Durcissement sécurité : search_path explicite + révocation EXECUTE
-- sur les SECURITY DEFINER côté API publique.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
