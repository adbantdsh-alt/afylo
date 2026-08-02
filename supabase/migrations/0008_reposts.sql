-- Reposts (republications) publics — visibles sur le profil de chacun.
-- À exécuter dans l'éditeur SQL Supabase.

create table if not exists public.reposts (
  id           uuid primary key default gen_random_uuid(),
  reposter_id  uuid not null references public.profiles(id) on delete cascade,
  post_id      text not null,          -- id de la publication d'origine
  payload      jsonb not null,         -- { mode, text, media, by, post, affiliate }
  created_at   timestamptz not null default now(),
  unique (reposter_id, post_id)        -- un seul repartage par publication
);

create index if not exists reposts_reposter_idx on public.reposts (reposter_id, created_at desc);

alter table public.reposts enable row level security;

-- Lecture PUBLIQUE (les reposts sont publics, comme le reste du profil sauf abonnés/abonnements)
create policy "reposts_read"   on public.reposts for select using (true);
-- On ne gère que SES propres reposts
create policy "reposts_insert" on public.reposts for insert with check (auth.uid() = reposter_id);
create policy "reposts_update" on public.reposts for update using (auth.uid() = reposter_id);
create policy "reposts_delete" on public.reposts for delete using (auth.uid() = reposter_id);
