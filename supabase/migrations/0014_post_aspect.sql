-- Afryko — proportion du média : afficher l'image/vidéo selon sa vraie dimension.
-- ratio = largeur / hauteur du 1er média (borné côté client entre ~0.56 et 1.91).
alter table public.posts
  add column if not exists aspect_ratio real;
