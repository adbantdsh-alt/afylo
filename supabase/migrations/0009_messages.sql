-- Messagerie directe réelle + confidentialité (qui peut m'écrire).
-- À exécuter dans l'éditeur SQL Supabase.

-- 1) Réglage de confidentialité des messages
alter table public.profiles
  add column if not exists messages_from text not null default 'everyone'
  check (messages_from in ('everyone', 'followers', 'nobody'));

-- 2) Messages directs
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind         text not null default 'text' check (kind in ('text', 'image', 'product')),
  text         text,
  media_url    text,
  product      jsonb,
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id, created_at);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);

alter table public.messages enable row level security;

-- Lecture : uniquement les 2 participants
create policy "messages_read" on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Marquer comme lu : le destinataire seulement
create policy "messages_update" on public.messages for update
  using (auth.uid() = recipient_id);

-- Envoi : je suis l'expéditeur ET le destinataire m'autorise (confidentialité)
create policy "messages_insert" on public.messages for insert with check (
  sender_id = auth.uid()
  and (
    exists (select 1 from public.profiles p where p.id = recipient_id and coalesce(p.messages_from, 'everyone') = 'everyone')
    or (
      exists (select 1 from public.profiles p where p.id = recipient_id and p.messages_from = 'followers')
      and exists (select 1 from public.follows f where f.follower_id = sender_id and f.following_id = recipient_id)
    )
    -- on peut toujours répondre à quelqu'un qui nous a déjà écrit
    or exists (select 1 from public.messages m where m.sender_id = recipient_id and m.recipient_id = sender_id)
  )
);
