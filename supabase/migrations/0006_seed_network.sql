-- ============================================================
--  Afryko — Seed « réseau réel » : 100 comptes de démarrage
--  Crée : auth.users + profiles + products + posts + post_products + follows
--
--  À exécuter dans : Supabase → SQL Editor → New query → Run
--  (Rejouable : si des comptes @afryko.demo existent déjà, le script s'arrête.)
--
--  Mot de passe commun des comptes seed : afryko2026
--  (comptes de peuplement ; à ne pas exposer en prod réelle)
-- ============================================================

do $$
declare
  firstnames text[] := array['Awa','Fatou','Modou','Cheikh','Sokhna','Ibou','Aida','Serigne','Mariama','Ousmane',
                             'Ndeye','Abdou','Khady','Moussa','Aminata','Pape','Rama','Babacar','Coumba','Lamine',
                             'Astou','Malick','Bineta','Souleymane','Dieynaba','Idrissa','Yacine','Amadou','Adja','Cheikhna'];
  lastnames  text[] := array['Ndiaye','Diop','Fall','Sow','Ba','Gueye','Sy','Faye','Diallo','Sarr',
                             'Cisse','Kane','Mbaye','Thiam','Toure','Niang','Seck','Camara','Diouf','Gaye'];
  niches   text[] := array['Mode','Beauté','Cuisine','Tech','Sport','Musique','Danse','Humour','Business','ASMR','Lifestyle','Voyage'];
  cities   text[] := array['Dakar','Thiès','Abidjan','Bamako','Saint-Louis','Ziguinchor','Conakry','Lomé','Cotonou','Ouagadougou'];
  prods    text[] := array['Ensemble wax premium','Coffret soin visage','Sneakers urbaines','Beatpack Afro','Sac raphia',
                           'Parfum unisexe','Boubou brodé main','Écouteurs sans fil Pro','Tenue de sport','Lampe déco design','Épices maison (lot)','Foulard soie'];
  i    int;
  j    int;
  uid  uuid;
  em   text;
  fn   text; ln text; nm text; nq text; ct text; atype text;
  hdl  text;
  pid  uuid;
  postid uuid;
begin
  -- Garde-fou : ne pas re-seeder
  if exists (select 1 from auth.users where email like '%@afryko.demo') then
    raise notice 'Seed déjà présent (@afryko.demo). Rien à faire.';
    return;
  end if;

  for i in 1..100 loop
    uid := gen_random_uuid();
    fn  := firstnames[1 + (i % array_length(firstnames,1))];
    ln  := lastnames[1 + ((i*3) % array_length(lastnames,1))];
    nm  := fn || ' ' || ln;
    nq  := niches[1 + (i % array_length(niches,1))];
    ct  := cities[1 + (i % array_length(cities,1))];
    hdl := lower(fn) || '.' || lower(ln) || i;
    em  := hdl || '@afryko.demo';
    atype := case when i % 3 = 0 then 'merchant' else 'creator' end;

    -- 1) Compte auth (email confirmé, mot de passe = afryko2026)
    insert into auth.users
      (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change)
    values
      (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', em,
       crypt('afryko2026', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('seed', true, 'name', nm),
       now() - make_interval(hours => i), now(),
       '', '', '', '');

    -- 2) Profil (le trigger a créé une base ; on l'enrichit)
    insert into public.profiles (id, handle, display_name, avatar_url, bio, account_type, is_verified, created_at)
    values (uid, hdl, nm, 'https://i.pravatar.cc/400?u=' || uid, nq || ' · ' || ct, atype, (i % 17 = 0), now() - make_interval(hours => i))
    on conflict (id) do update
      set handle = excluded.handle, display_name = excluded.display_name, avatar_url = excluded.avatar_url,
          bio = excluded.bio, account_type = excluded.account_type, is_verified = excluded.is_verified;

    -- 3) Produit (créateurs & marchands vendent)
    pid := gen_random_uuid();
    insert into public.products (id, owner_id, title, description, price_cfa, stock, image_url, commission_pct, sold_count)
    values (pid, uid, prods[1 + (i % array_length(prods,1))], 'Proposé par ' || nm || ' à ' || ct,
            (5 + (i % 40)) * 1000, 10 + (i % 50), 'https://picsum.photos/seed/afprod' || i || '/600/600',
            (10 + (i % 20)), (i % 30));

    -- 4) 2 posts par compte + attache le produit au 1er
    for j in 1..2 loop
      postid := gen_random_uuid();
      insert into public.posts (id, author_id, kind, media_url, thumbnail_url, caption,
                                like_count, comment_count, view_count, created_at)
      values (postid, uid, case when (i + j) % 2 = 0 then 'video' else 'image' end,
              'https://picsum.photos/seed/afpost' || i || j || '/700/900',
              'https://picsum.photos/seed/afpost' || i || j || '/700/900',
              nm || ' — ' || nq || ' à ' || ct || ' 🔥',
              (i * 7 + j * 13) % 12000, (i + j * 5) % 500, (i * 137 + j * 211) % 200000,
              now() - make_interval(hours => i * 2 + j));
      if j = 1 then
        insert into public.post_products (post_id, product_id) values (postid, pid) on conflict do nothing;
      end if;
    end loop;
  end loop;

  -- 5) Graphe de follows (~5% des paires) — uniquement entre comptes seed
  insert into public.follows (follower_id, following_id)
  select a.id, b.id
  from public.profiles a
  join public.profiles b on a.id <> b.id
  join auth.users ua on ua.id = a.id and ua.email like '%@afryko.demo'
  join auth.users ub on ub.id = b.id and ub.email like '%@afryko.demo'
  where random() < 0.05
  on conflict do nothing;

  raise notice 'Seed terminé : 100 comptes + produits + ~200 posts + follows.';
end $$;
