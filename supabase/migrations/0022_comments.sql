-- Afylo — commentaires réels : réponses (parent_id), compteur comment_count tenu à jour,
-- notification "commentaire", et suppression autorisée au propriétaire du post.
-- La table public.comments existe déjà (0001) : id, post_id, author_id, body, created_at.
-- À exécuter dans l'éditeur SQL Supabase.

-- 1. Réponses imbriquées : un commentaire peut répondre à un autre.
alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;
create index if not exists idx_comments_parent on public.comments(parent_id);

-- 2. Le propriétaire du post peut supprimer n'importe quel commentaire (modération).
--    (La policy comments_delete de 0001 n'autorise que l'auteur du commentaire.)
drop policy if exists "comments_delete_by_post_owner" on public.comments;
create policy "comments_delete_by_post_owner" on public.comments for delete using (
  auth.uid() = (select p.author_id from public.posts p where p.id = comments.post_id)
);

-- 3. Compteur comment_count sur posts, tenu à jour par trigger.
create or replace function public.bump_comment_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_comment_count on public.comments;
create trigger trg_comment_count
  after insert or delete on public.comments
  for each row execute function public.bump_comment_count();

-- Recalage initial (au cas où des commentaires existeraient déjà).
update public.posts p
  set comment_count = (select count(*) from public.comments c where c.post_id = p.id);

-- 4. Notification "commentaire" : l'auteur du post est notifié ; en cas de réponse,
--    l'auteur du commentaire parent est aussi notifié (sans doublon ni auto-notif).
create or replace function public.notify_comment() returns trigger language plpgsql security definer as $$
declare post_author uuid; parent_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is not null and post_author <> new.author_id then
    insert into public.notifications (user_id, actor_id, kind, target_id)
    values (post_author, new.author_id, 'comment', new.post_id::text);
  end if;
  if new.parent_id is not null then
    select author_id into parent_author from public.comments where id = new.parent_id;
    if parent_author is not null and parent_author <> new.author_id and parent_author is distinct from post_author then
      insert into public.notifications (user_id, actor_id, kind, target_id)
      values (parent_author, new.author_id, 'comment', new.post_id::text);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment after insert on public.comments
  for each row execute function public.notify_comment();
