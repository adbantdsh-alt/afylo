-- Afylo — produits digitaux + offres de quantité (prix par lot)
-- À exécuter dans Supabase → SQL Editor → Run

alter table public.products add column if not exists kind text not null default 'physical'
  check (kind in ('physical', 'digital'));
alter table public.products add column if not exists digital_file_url text;         -- fichier livré à l'acheteur
alter table public.products add column if not exists quantity_tiers jsonb not null default '[]'; -- [{qty, price_cfa}]
