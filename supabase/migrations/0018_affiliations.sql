-- Afylo — affiliation : produits qu'un revendeur ajoute à sa boutique pour les promouvoir.
-- (Il touche la commission définie par le vendeur d'origine.)
-- À exécuter dans l'éditeur SQL Supabase.

create table if not exists public.affiliations (
  reseller_id uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (reseller_id, product_id)
);
create index if not exists idx_affil_reseller on public.affiliations (reseller_id, created_at desc);

alter table public.affiliations enable row level security;
drop policy if exists "affil_read"   on public.affiliations;
drop policy if exists "affil_insert" on public.affiliations;
drop policy if exists "affil_delete" on public.affiliations;
create policy "affil_read"   on public.affiliations for select using (auth.uid() = reseller_id);
create policy "affil_insert" on public.affiliations for insert with check (auth.uid() = reseller_id);
create policy "affil_delete" on public.affiliations for delete using (auth.uid() = reseller_id);
