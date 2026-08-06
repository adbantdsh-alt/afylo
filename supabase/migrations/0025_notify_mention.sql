-- Afylo — notification "mention" : quand un @handle apparaît dans un commentaire
-- ou la légende d'un post, la personne mentionnée est notifiée.
-- À exécuter dans l'éditeur SQL Supabase (après 0022–0024).

-- Mentions dans un COMMENTAIRE
create or replace function public.notify_mention_comment() returns trigger language plpgsql security definer as $$
declare h text; uid uuid;
begin
  for h in select distinct lower(m[1]) from regexp_matches(coalesce(new.body, ''), '@([A-Za-z0-9_.]+)', 'g') m loop
    select id into uid from public.profiles where lower(handle) = h;
    if uid is not null and uid <> new.author_id then
      insert into public.notifications (user_id, actor_id, kind, target_id)
      values (uid, new.author_id, 'mention', new.post_id::text);
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists trg_notify_mention_comment on public.comments;
create trigger trg_notify_mention_comment after insert on public.comments
  for each row execute function public.notify_mention_comment();

-- Mentions dans la LÉGENDE d'un post
create or replace function public.notify_mention_post() returns trigger language plpgsql security definer as $$
declare h text; uid uuid;
begin
  if new.caption is null then return new; end if;
  for h in select distinct lower(m[1]) from regexp_matches(new.caption, '@([A-Za-z0-9_.]+)', 'g') m loop
    select id into uid from public.profiles where lower(handle) = h;
    if uid is not null and uid <> new.author_id then
      insert into public.notifications (user_id, actor_id, kind, target_id)
      values (uid, new.author_id, 'mention', new.id::text);
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists trg_notify_mention_post on public.posts;
create trigger trg_notify_mention_post after insert on public.posts
  for each row execute function public.notify_mention_post();
