-- ============================================================
--  Afylo — Schéma initial (V1)
--  « Là où l'Afrique crée, vend et gagne. »
--
--  À exécuter dans : Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
--  Helper : mise à jour automatique de updated_at
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
--  1. PROFILES  (extension de auth.users)
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  handle       text unique,
  display_name text,
  avatar_url   text,
  bio          text,
  account_type text not null default 'creator'
               check (account_type in ('creator','merchant','buyer')),
  is_verified  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    split_part(new.email, '@', 1),
    split_part(new.email, '@', 1)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  2. FOLLOWS  (graphe social)
-- ============================================================
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ============================================================
--  3. PRODUCTS  (boutiques)
-- ============================================================
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  description    text,
  price_cfa      integer not null check (price_cfa >= 0),
  currency       text not null default 'XOF',
  stock          integer not null default 0 check (stock >= 0),
  image_url      text,
  commission_pct numeric(5,2) not null default 0 check (commission_pct between 0 and 100),
  is_active      boolean not null default true,
  sold_count     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_products_owner on public.products(owner_id);

create trigger trg_products_updated
  before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================
--  4. POSTS  (feed : image / vidéo / story)
-- ============================================================
create table if not exists public.posts (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references public.profiles(id) on delete cascade,
  kind             text not null default 'image'
                   check (kind in ('image','video','story')),
  media_url        text,
  thumbnail_url    text,
  caption          text,
  duration_seconds integer,
  like_count       integer not null default 0,
  comment_count    integer not null default 0,
  view_count       integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_posts_author  on public.posts(author_id);
create index if not exists idx_posts_created on public.posts(created_at desc);

-- ============================================================
--  5. POST_PRODUCTS  (attacher des produits à un post → « Acheter »)
-- ============================================================
create table if not exists public.post_products (
  post_id    uuid not null references public.posts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (post_id, product_id)
);

-- ============================================================
--  6. LIKES & COMMENTS
-- ============================================================
create table if not exists public.likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_post on public.comments(post_id);

-- Maintien du compteur de likes
create or replace function public.bump_like_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_like_count on public.likes;
create trigger trg_like_count
  after insert or delete on public.likes
  for each row execute function public.bump_like_count();

-- ============================================================
--  7. LIVES
-- ============================================================
create table if not exists public.lives (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references public.profiles(id) on delete cascade,
  title         text,
  status        text not null default 'scheduled'
                check (status in ('scheduled','live','ended')),
  thumbnail_url text,
  viewer_peak   integer not null default 0,
  revenue_cfa   integer not null default 0,
  started_at    timestamptz,
  ended_at      timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_lives_host on public.lives(host_id);

-- ============================================================
--  8. AFFILIATIONS  (un créateur revend le produit d'un commerçant)
-- ============================================================
create table if not exists public.affiliations (
  reseller_id    uuid not null references public.profiles(id) on delete cascade,
  product_id     uuid not null references public.products(id) on delete cascade,
  commission_pct numeric(5,2) not null default 0,
  created_at     timestamptz not null default now(),
  primary key (reseller_id, product_id)
);

-- ============================================================
--  9. ORDERS  (achats + cycle escrow XaalisPay)
-- ============================================================
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  buyer_id         uuid not null references public.profiles(id) on delete restrict,
  seller_id        uuid not null references public.profiles(id) on delete restrict,
  reseller_id      uuid references public.profiles(id) on delete set null,
  product_id       uuid not null references public.products(id) on delete restrict,
  quantity         integer not null default 1 check (quantity > 0),
  amount_cfa       integer not null check (amount_cfa >= 0),
  commission_cfa   integer not null default 0,
  platform_fee_cfa integer not null default 0,
  status           text not null default 'pending'
                   check (status in ('pending','paid','shipped','delivered','released','cancelled')),
  payment_method   text default 'wave',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_orders_buyer  on public.orders(buyer_id);
create index if not exists idx_orders_seller on public.orders(seller_id);

create trigger trg_orders_updated
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
--  RLS — Row Level Security
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.follows       enable row level security;
alter table public.products      enable row level security;
alter table public.posts         enable row level security;
alter table public.post_products enable row level security;
alter table public.likes         enable row level security;
alter table public.comments      enable row level security;
alter table public.lives         enable row level security;
alter table public.affiliations  enable row level security;
alter table public.orders        enable row level security;

-- Profiles : lecture publique, modification de soi
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Follows : lecture publique, gestion de ses propres follows
create policy "follows_read"   on public.follows for select using (true);
create policy "follows_insert" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete" on public.follows for delete using (auth.uid() = follower_id);

-- Products : lecture publique, CRUD par le propriétaire
create policy "products_read"   on public.products for select using (true);
create policy "products_insert" on public.products for insert with check (auth.uid() = owner_id);
create policy "products_update" on public.products for update using (auth.uid() = owner_id);
create policy "products_delete" on public.products for delete using (auth.uid() = owner_id);

-- Posts : lecture publique, CRUD par l'auteur
create policy "posts_read"   on public.posts for select using (true);
create policy "posts_insert" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts_update" on public.posts for update using (auth.uid() = author_id);
create policy "posts_delete" on public.posts for delete using (auth.uid() = author_id);

-- Post_products : lecture publique, gestion si on possède le post
create policy "post_products_read" on public.post_products for select using (true);
create policy "post_products_write" on public.post_products for all
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

-- Likes : lecture publique, gestion de ses likes
create policy "likes_read"   on public.likes for select using (true);
create policy "likes_insert" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete" on public.likes for delete using (auth.uid() = user_id);

-- Comments : lecture publique, écriture par l'auteur
create policy "comments_read"   on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments_delete" on public.comments for delete using (auth.uid() = author_id);

-- Lives : lecture publique, gestion par l'hôte
create policy "lives_read"  on public.lives for select using (true);
create policy "lives_write" on public.lives for all
  using (auth.uid() = host_id) with check (auth.uid() = host_id);

-- Affiliations : lecture publique, gestion par le revendeur
create policy "affiliations_read"  on public.affiliations for select using (true);
create policy "affiliations_write" on public.affiliations for all
  using (auth.uid() = reseller_id) with check (auth.uid() = reseller_id);

-- Orders : visibles par acheteur / vendeur / revendeur ; création par l'acheteur
create policy "orders_read" on public.orders for select
  using (auth.uid() in (buyer_id, seller_id, reseller_id));
create policy "orders_insert" on public.orders for insert with check (auth.uid() = buyer_id);
create policy "orders_update" on public.orders for update
  using (auth.uid() in (buyer_id, seller_id));

-- ============================================================
--  STOCKAGE (buckets publics en lecture)
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('avatars',  'avatars',  true),
  ('media',    'media',    true),
  ('products', 'products', true)
on conflict (id) do nothing;

-- Lecture publique des 3 buckets
create policy "public_read_storage" on storage.objects for select
  using (bucket_id in ('avatars','media','products'));

-- Upload / modif / suppression réservés à l'utilisateur connecté,
-- dans un dossier à son nom (ex: media/<uid>/photo.jpg)
create policy "auth_write_storage" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','media','products') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "auth_update_storage" on storage.objects for update to authenticated
  using (bucket_id in ('avatars','media','products') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "auth_delete_storage" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','media','products') and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
--  FIN
-- ============================================================
