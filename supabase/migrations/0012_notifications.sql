-- Notifications réelles (générées côté serveur par déclencheurs).
-- À exécuter dans l'éditeur SQL Supabase.

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,   -- destinataire
  actor_id   uuid references public.profiles(id) on delete set null,           -- qui a déclenché
  kind       text not null check (kind in ('follow','sale','commission','live','like','comment','mention','repost')),
  target_id  text,                                                             -- id post/commande/live
  text       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notif_read"   on public.notifications for select using (auth.uid() = user_id);
create policy "notif_update" on public.notifications for update using (auth.uid() = user_id);
-- (aucune insertion directe : uniquement via les déclencheurs SECURITY DEFINER)

-- Nouvel abonné
create or replace function public.notify_follow() returns trigger language plpgsql security definer as $$
begin
  insert into public.notifications (user_id, actor_id, kind)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end; $$;
drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow after insert on public.follows
  for each row execute function public.notify_follow();

-- Live démarré → notifie les abonnés de l'hôte
create or replace function public.notify_live() returns trigger language plpgsql security definer as $$
begin
  if new.status = 'live' then
    insert into public.notifications (user_id, actor_id, kind, target_id)
    select f.follower_id, new.host_id, 'live', new.id::text
    from public.follows f where f.following_id = new.host_id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_live on public.lives;
create trigger trg_notify_live after insert on public.lives
  for each row execute function public.notify_live();

-- Vente → notifie le vendeur (et le revendeur pour sa commission)
create or replace function public.notify_order() returns trigger language plpgsql security definer as $$
begin
  insert into public.notifications (user_id, actor_id, kind, target_id)
  values (new.seller_id, new.buyer_id, 'sale', new.id::text);
  if new.reseller_id is not null then
    insert into public.notifications (user_id, actor_id, kind, target_id)
    values (new.reseller_id, new.buyer_id, 'commission', new.id::text);
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_order on public.orders;
create trigger trg_notify_order after insert on public.orders
  for each row execute function public.notify_order();
