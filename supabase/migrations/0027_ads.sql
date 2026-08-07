-- Afylo Ads — Phase 1 « Booster » : promotion payante d'un post / produit / live.
-- Paiement Mobile Money (simulé en MVP). À exécuter dans l'éditeur SQL Supabase.

create table if not exists public.ad_campaigns (
  id            uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.profiles(id) on delete cascade,
  target_kind   text not null check (target_kind in ('post','product','live')),
  target_id     text not null,                    -- id du post/produit/live promu
  budget_cfa    integer not null,
  days          integer not null,
  status        text not null default 'active' check (status in ('active','ended')),
  impressions   integer not null default 0,
  clicks        integer not null default 0,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz not null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_ads_active on public.ad_campaigns (target_kind, status, ends_at);
create index if not exists idx_ads_advertiser on public.ad_campaigns (advertiser_id, created_at desc);

alter table public.ad_campaigns enable row level security;

-- Lecture publique (l'app doit savoir quels contenus sont sponsorisés pour les injecter).
drop policy if exists "ads_read" on public.ad_campaigns;
create policy "ads_read" on public.ad_campaigns for select using (true);

-- Création / gestion : uniquement par l'annonceur pour lui-même.
drop policy if exists "ads_insert" on public.ad_campaigns;
create policy "ads_insert" on public.ad_campaigns for insert with check (auth.uid() = advertiser_id);
drop policy if exists "ads_update" on public.ad_campaigns;
create policy "ads_update" on public.ad_campaigns for update using (auth.uid() = advertiser_id);
drop policy if exists "ads_delete" on public.ad_campaigns;
create policy "ads_delete" on public.ad_campaigns for delete using (auth.uid() = advertiser_id);

-- Incrément d'impression/clic (SECURITY DEFINER pour contourner la RLS d'update sans exposer d'écriture large).
create or replace function public.bump_ad(p_id uuid, p_kind text) returns void language plpgsql security definer as $$
begin
  if p_kind = 'click' then
    update public.ad_campaigns set clicks = clicks + 1 where id = p_id;
  else
    update public.ad_campaigns set impressions = impressions + 1 where id = p_id;
  end if;
end $$;
grant execute on function public.bump_ad(uuid, text) to anon, authenticated;
