-- Afylo — les nouveaux comptes sont "Simple" (buyer) par défaut.
-- Le passage en "Pro" (creator/merchant) se fait volontairement pour vendre/affilier.
-- À exécuter dans Supabase → SQL Editor → Run

alter table public.profiles alter column account_type set default 'buyer';

-- Le trigger de création de profil insère désormais explicitement 'buyer'
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle, display_name, account_type)
  values (new.id, split_part(new.email, '@', 1), split_part(new.email, '@', 1), 'buyer')
  on conflict (id) do nothing;
  return new;
end $$;
