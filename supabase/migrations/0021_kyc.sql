-- Afylo — retrait des gains : vérification 18+ et identité (KYC) avant paiement.
alter table public.profiles add column if not exists birthdate  date;
alter table public.profiles add column if not exists kyc_status text not null default 'none'
  check (kyc_status in ('none', 'pending', 'verified'));
alter table public.profiles add column if not exists legal_name text;
