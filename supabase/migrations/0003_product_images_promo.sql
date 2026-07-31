-- Afylo — produits : images multiples + prix promo
-- À exécuter dans Supabase → SQL Editor → Run

alter table public.products add column if not exists images text[] not null default '{}';
alter table public.products add column if not exists promo_cfa integer;
