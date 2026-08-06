-- Afylo — fiche produit : frais de livraison (0 = gratuit) + avis des acheteurs.
-- Toutes les commandes sont payées d'avance (séquestre XaalisPay, livraison max 48h) : pas de COD.
-- À exécuter dans l'éditeur SQL Supabase.

-- 1. Frais de livraison du produit (0 = gratuit).
alter table public.products add column if not exists delivery_fee_cfa integer not null default 0;

-- 2. Avis : seuls les acheteurs (une commande existante sur ce produit) peuvent noter.
create table if not exists public.product_reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  rating     int  not null check (rating between 1 and 5),
  body       text,
  created_at timestamptz not null default now(),
  unique (product_id, author_id)
);
create index if not exists idx_reviews_product on public.product_reviews(product_id);

alter table public.product_reviews enable row level security;

drop policy if exists "reviews_read" on public.product_reviews;
create policy "reviews_read" on public.product_reviews for select using (true);

drop policy if exists "reviews_insert" on public.product_reviews;
create policy "reviews_insert" on public.product_reviews for insert with check (
  auth.uid() = author_id
  and exists (
    select 1 from public.orders o
    where o.product_id = product_reviews.product_id and o.buyer_id = auth.uid()
  )
);

drop policy if exists "reviews_update" on public.product_reviews;
create policy "reviews_update" on public.product_reviews for update using (auth.uid() = author_id);

drop policy if exists "reviews_delete" on public.product_reviews;
create policy "reviews_delete" on public.product_reviews for delete using (auth.uid() = author_id);
