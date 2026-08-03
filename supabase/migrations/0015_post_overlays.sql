-- Afryko — éditeur façon Snap : calques (texte / lien cliquable) + son coupé.
-- overlays = [{ id, kind:'text'|'link', text, x, y, color, url }] (x,y = fraction 0..1 du cadre)
alter table public.posts add column if not exists overlays jsonb not null default '[]';
alter table public.posts add column if not exists muted boolean not null default false;
