-- Afylo — ajoute le lien web au profil
-- À exécuter dans Supabase → SQL Editor → Run

alter table public.profiles add column if not exists website text;
