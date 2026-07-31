-- Afylo — désactivation & suppression de compte (RGPD)
-- À exécuter dans Supabase → SQL Editor → Run

-- Désactivation (compte masqué, données conservées)
alter table public.profiles add column if not exists is_active boolean not null default true;

-- Suppression : un utilisateur connecté peut supprimer SON propre compte auth.
-- (cascade supprime profil, produits, posts, etc. via les FK on delete cascade)
create or replace function public.delete_user()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
