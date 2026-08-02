-- Afryko — carrousel : plusieurs médias par publication
-- media_url reste (1er média, rétro-compatible) ; media_urls contient toute la galerie.
alter table public.posts
  add column if not exists media_urls text[] not null default '{}';
