-- Feed Live : type de live (vendeur/simple) + compteur de spectateurs en direct.
-- À exécuter dans l'éditeur SQL Supabase.

alter table public.lives
  add column if not exists kind text not null default 'simple'
  check (kind in ('simple', 'sell'));
alter table public.lives add column if not exists viewer_count int not null default 0;

create index if not exists idx_lives_status on public.lives (status, viewer_count desc);
