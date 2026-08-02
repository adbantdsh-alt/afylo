-- Messages riches façon WhatsApp : vocal, vidéo, fichier.
-- À exécuter dans l'éditeur SQL Supabase.

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages
  add constraint messages_kind_check
  check (kind in ('text', 'image', 'product', 'voice', 'video', 'file'));

alter table public.messages add column if not exists file_name text;
alter table public.messages add column if not exists duration real; -- secondes (vocal/vidéo)
