-- Afylo — inscription : téléphone + pays obligatoires (éligibilité rémunération).
-- Le trigger de création de profil lit ces valeurs dans les métadonnées d'inscription
-- (options.data) → capturées dès la création du compte.
-- À exécuter dans l'éditeur SQL Supabase.

alter table public.profiles add column if not exists phone   text;
alter table public.profiles add column if not exists country text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle, display_name, account_type, phone, country)
  values (
    new.id,
    split_part(new.email, '@', 1),
    split_part(new.email, '@', 1),
    'buyer',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country'
  )
  on conflict (id) do nothing;
  return new;
end $$;
