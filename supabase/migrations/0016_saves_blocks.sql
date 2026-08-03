-- Afryko — enregistrements (posts sauvegardés) + blocages
-- À exécuter dans l'éditeur SQL Supabase.

-- Posts enregistrés (bookmarks)
create table if not exists public.saved_posts (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists idx_saved_user on public.saved_posts (user_id, created_at desc);

alter table public.saved_posts enable row level security;
drop policy if exists "saved_read"   on public.saved_posts;
drop policy if exists "saved_insert" on public.saved_posts;
drop policy if exists "saved_delete" on public.saved_posts;
create policy "saved_read"   on public.saved_posts for select using (auth.uid() = user_id);
create policy "saved_insert" on public.saved_posts for insert with check (auth.uid() = user_id);
create policy "saved_delete" on public.saved_posts for delete using (auth.uid() = user_id);

-- Blocages
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.blocks enable row level security;
drop policy if exists "blocks_read"   on public.blocks;
drop policy if exists "blocks_insert" on public.blocks;
drop policy if exists "blocks_delete" on public.blocks;
create policy "blocks_read"   on public.blocks for select using (auth.uid() = blocker_id);
create policy "blocks_insert" on public.blocks for insert with check (auth.uid() = blocker_id);
create policy "blocks_delete" on public.blocks for delete using (auth.uid() = blocker_id);
