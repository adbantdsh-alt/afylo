-- Afylo — notification "j'aime" : quand quelqu'un aime ton post, tu es notifié.
-- (Le système de notifs 0012 gérait follow/vente/live mais pas les likes.)
-- À exécuter dans l'éditeur SQL Supabase.

create or replace function public.notify_like() returns trigger language plpgsql security definer as $$
declare author uuid;
begin
  select author_id into author from public.posts where id = new.post_id;
  -- pas de notif pour ses propres likes
  if author is not null and author <> new.user_id then
    insert into public.notifications (user_id, actor_id, kind, target_id)
    values (author, new.user_id, 'like', new.post_id::text);
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_like on public.likes;
create trigger trg_notify_like after insert on public.likes
  for each row execute function public.notify_like();
