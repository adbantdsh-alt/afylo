-- Refonte profil façon X (Twitter) : bannière + posts 100% texte
-- À exécuter dans l'éditeur SQL Supabase.

-- 1) Bannière de profil (image de couverture)
alter table public.profiles add column if not exists banner_url text;

-- 2) Autoriser les publications 100% texte (fil façon X)
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts
  add constraint posts_kind_check
  check (kind in ('image', 'video', 'story', 'text'));
