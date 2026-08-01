-- ============================================================
--  Afryko — Seed « réseau réel » : 100 comptes de démarrage
--  (version sans do-block : 6 instructions, robuste dans le SQL Editor)
--  Crée : auth.users + profiles + products + posts + post_products + follows
--  Mot de passe commun des comptes seed : afryko2026
--  Rejouable (garde-fous not exists / on conflict).
-- ============================================================

-- 1) 100 comptes auth (email confirmé) + métadonnées riches
insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change_token_new, email_change)
select
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  lower(fn) || '.' || lower(ln) || i || '@afryko.demo',
  crypt('afryko2026', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'seed', true, 'n', i, 'name', fn || ' ' || ln,
    'handle', lower(fn) || '.' || lower(ln) || i,
    'niche', nq, 'city', ct, 'bio', nq || ' · ' || ct,
    'avatar', 'https://i.pravatar.cc/400?u=' || lower(fn) || lower(ln) || i,
    'product', pr,
    'atype', case when i % 3 = 0 then 'merchant' else 'creator' end,
    'verified', (i % 17 = 0)
  ),
  now() - make_interval(hours => i), now(),
  '', '', '', ''
from (
  select i,
    (array['Awa','Fatou','Modou','Cheikh','Sokhna','Ibou','Aida','Serigne','Mariama','Ousmane','Ndeye','Abdou','Khady','Moussa','Aminata','Pape','Rama','Babacar','Coumba','Lamine','Astou','Malick','Bineta','Souleymane','Dieynaba','Idrissa','Yacine','Amadou','Adja','Cheikhna'])[1 + (i % 30)] as fn,
    (array['Ndiaye','Diop','Fall','Sow','Ba','Gueye','Sy','Faye','Diallo','Sarr','Cisse','Kane','Mbaye','Thiam','Toure','Niang','Seck','Camara','Diouf','Gaye'])[1 + ((i*3) % 20)] as ln,
    (array['Mode','Beauté','Cuisine','Tech','Sport','Musique','Danse','Humour','Business','ASMR','Lifestyle','Voyage'])[1 + (i % 12)] as nq,
    (array['Dakar','Thiès','Abidjan','Bamako','Saint-Louis','Ziguinchor','Conakry','Lomé','Cotonou','Ouagadougou'])[1 + (i % 10)] as ct,
    (array['Ensemble wax premium','Coffret soin visage','Sneakers urbaines','Beatpack Afro','Sac raphia','Parfum unisexe','Boubou brodé main','Écouteurs sans fil Pro','Tenue de sport','Lampe déco design','Épices maison (lot)','Foulard soie'])[1 + (i % 12)] as pr
  from generate_series(1,100) as i
) base
where not exists (select 1 from auth.users where email like '%@afryko.demo');

-- 2) Enrichir les profils (le trigger a créé la base)
update public.profiles p set
  display_name = u.raw_user_meta_data->>'name',
  handle       = u.raw_user_meta_data->>'handle',
  avatar_url   = u.raw_user_meta_data->>'avatar',
  bio          = u.raw_user_meta_data->>'bio',
  account_type = u.raw_user_meta_data->>'atype',
  is_verified  = (u.raw_user_meta_data->>'verified')::boolean
from auth.users u
where p.id = u.id and u.email like '%@afryko.demo';

-- 3) Un produit par compte
insert into public.products (owner_id, title, description, price_cfa, stock, image_url, commission_pct, sold_count)
select u.id,
  u.raw_user_meta_data->>'product',
  'Proposé par ' || (u.raw_user_meta_data->>'name') || ' à ' || (u.raw_user_meta_data->>'city'),
  (5 + ((u.raw_user_meta_data->>'n')::int % 40)) * 1000,
  10 + ((u.raw_user_meta_data->>'n')::int % 50),
  'https://picsum.photos/seed/afprod' || (u.raw_user_meta_data->>'n') || '/600/600',
  10 + ((u.raw_user_meta_data->>'n')::int % 20),
  ((u.raw_user_meta_data->>'n')::int % 30)
from auth.users u
where u.email like '%@afryko.demo'
  and not exists (select 1 from public.products pr where pr.owner_id = u.id);

-- 4) 2 posts par compte
insert into public.posts (author_id, kind, media_url, thumbnail_url, caption, like_count, comment_count, view_count, created_at)
select u.id,
  case when ((u.raw_user_meta_data->>'n')::int + g) % 2 = 0 then 'video' else 'image' end,
  'https://picsum.photos/seed/afpost' || (u.raw_user_meta_data->>'n') || g || '/700/900',
  'https://picsum.photos/seed/afpost' || (u.raw_user_meta_data->>'n') || g || '/700/900',
  (u.raw_user_meta_data->>'name') || ' — ' || (u.raw_user_meta_data->>'niche') || ' à ' || (u.raw_user_meta_data->>'city') || ' 🔥',
  (((u.raw_user_meta_data->>'n')::int)*7 + g*13) % 12000,
  (((u.raw_user_meta_data->>'n')::int) + g*5) % 500,
  (((u.raw_user_meta_data->>'n')::int)*137 + g*211) % 200000,
  now() - make_interval(hours => ((u.raw_user_meta_data->>'n')::int)*2 + g)
from auth.users u
cross join generate_series(1,2) as g
where u.email like '%@afryko.demo'
  and not exists (select 1 from public.posts po where po.author_id = u.id);

-- 5) Attacher le produit au 1er post de chaque compte
insert into public.post_products (post_id, product_id)
select po.id, pr.id
from public.products pr
join auth.users u on u.id = pr.owner_id and u.email like '%@afryko.demo'
join lateral (
  select id from public.posts where author_id = pr.owner_id order by created_at asc limit 1
) po on true
on conflict do nothing;

-- 6) Graphe de follows (~3% des paires)
insert into public.follows (follower_id, following_id)
select a.id, b.id
from public.profiles a
join public.profiles b on a.id <> b.id
join auth.users ua on ua.id = a.id and ua.email like '%@afryko.demo'
join auth.users ub on ub.id = b.id and ub.email like '%@afryko.demo'
where random() < 0.03
on conflict do nothing;
