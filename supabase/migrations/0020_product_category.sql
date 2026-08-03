-- Afylo — catégorie produit (pour le marketplace d'affiliation : filtres par catégorie).
alter table public.products add column if not exists category text;
create index if not exists idx_products_category on public.products (category);
