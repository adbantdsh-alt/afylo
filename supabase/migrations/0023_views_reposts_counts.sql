-- Afylo — compteurs manquants : vues (view_count), reposts (repost_count) + notif repost.
-- À exécuter dans l'éditeur SQL Supabase (après 0022).

-- 1. Incrément des VUES d'un post (appelé par le lecteur vidéo/post). SECURITY DEFINER
--    pour contourner la RLS "update auteur seul" sur posts, sans exposer d'autre écriture.
create or replace function public.increment_post_view(p_post_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.posts set view_count = view_count + 1 where id = p_post_id;
end $$;
grant execute on function public.increment_post_view(uuid) to anon, authenticated;

-- 2. Compteur de REPOSTS (partages réels) sur posts, tenu à jour par trigger.
--    reposts.post_id est un text → on compare id::text.
alter table public.posts add column if not exists repost_count integer not null default 0;

create or replace function public.bump_repost_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set repost_count = repost_count + 1 where id::text = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set repost_count = greatest(repost_count - 1, 0) where id::text = old.post_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_repost_count on public.reposts;
create trigger trg_repost_count
  after insert or delete on public.reposts
  for each row execute function public.bump_repost_count();

-- Recalage initial.
update public.posts p
  set repost_count = (select count(*) from public.reposts r where r.post_id = p.id::text);

-- 3. Notification "repost" : l'auteur du post est notifié quand on le repartage.
create or replace function public.notify_repost() returns trigger language plpgsql security definer as $$
declare author uuid;
begin
  select author_id into author from public.posts where id::text = new.post_id;
  if author is not null and author <> new.reposter_id then
    insert into public.notifications (user_id, actor_id, kind, target_id)
    values (author, new.reposter_id, 'repost', new.post_id);
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_repost on public.reposts;
create trigger trg_notify_repost after insert on public.reposts
  for each row execute function public.notify_repost();
