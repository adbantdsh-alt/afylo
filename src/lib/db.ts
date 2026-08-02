/**
 * Couche d'accès aux données Afryko (Supabase).
 * Les écritures passent par RLS : owner_id / author_id doivent = auth.uid().
 */
import { supabase } from './supabase';
import type { Order, Post, Product, Profile } from '@/types/db';

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Connecte-toi pour effectuer cette action.');
  return user.id;
}

// ---- Profil ----
export async function getMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return data;
}

export type ProfileInput = {
  display_name?: string;
  handle?: string;
  bio?: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  banner_position?: number;
  website?: string | null;
  account_type?: 'creator' | 'merchant' | 'buyer';
  messages_from?: 'everyone' | 'followers' | 'nobody';
};

export async function updateMyProfile(patch: ProfileInput): Promise<void> {
  const id = await requireUserId();
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}

/** Passe le compte en professionnel (vendeur/affilié). */
export async function upgradeToPro(): Promise<void> {
  await updateMyProfile({ account_type: 'creator' });
}

/** Un compte 'buyer' est SIMPLE ; tout le reste est PRO (vendeur/affilié). */
export const isProAccount = (t?: string | null) => !!t && t !== 'buyer';

// ---- Profil public d'un créateur (vue visiteur) ----
export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const h = handle.replace(/^@/, '');
  const { data } = await supabase.from('profiles').select('*').eq('handle', h).maybeSingle();
  return data;
}

/** Recherche de comptes par nom OU @handle (vrais profils Supabase). */
export async function searchProfiles(q: string): Promise<Profile[]> {
  const term = q.trim().replace(/^@/, '').replace(/[,()%*]/g, ' ').trim();
  let req = supabase.from('profiles').select('*').limit(40);
  if (term) req = req.or(`display_name.ilike.%${term}%,handle.ilike.%${term}%`);
  else req = req.order('created_at', { ascending: false });
  const { data, error } = await req;
  if (error) return [];
  return (data as Profile[]) ?? [];
}

// ---- Lives (feed en direct) ----
export type LiveRow = {
  id: string;
  host_id: string;
  title: string | null;
  status: 'scheduled' | 'live' | 'ended';
  kind: 'simple' | 'sell';
  thumbnail_url: string | null;
  viewer_count: number;
  started_at: string | null;
  host?: { id: string; display_name: string | null; handle: string | null; avatar_url: string | null; is_verified: boolean; account_type: string } | null;
};

/** Démarre un live (crée la ligne en base) et renvoie son id. */
export async function startLive(input: { title?: string; kind?: 'simple' | 'sell'; thumbnail_url?: string | null }): Promise<LiveRow | null> {
  const host_id = await requireUserId();
  const { data, error } = await supabase
    .from('lives')
    .insert({ host_id, title: input.title ?? null, kind: input.kind ?? 'simple', thumbnail_url: input.thumbnail_url ?? null, status: 'live', started_at: new Date().toISOString(), viewer_count: 1 })
    .select()
    .single();
  if (error) return null;
  return data as LiveRow;
}

/** Termine un live. */
export async function endLive(id: string): Promise<void> {
  await supabase.from('lives').update({ status: 'ended', ended_at: new Date().toISOString(), viewer_count: 0 }).eq('id', id);
}

/** Lives EN DIRECT (avec l'hôte), pour le Feed. */
export async function listLiveNow(): Promise<LiveRow[]> {
  const since = new Date(Date.now() - 4 * 3600_000).toISOString(); // masque les lives orphelins (>4h)
  const { data, error } = await supabase
    .from('lives')
    .select('id,host_id,title,status,kind,thumbnail_url,viewer_count,started_at, host:profiles!lives_host_id_fkey(id,display_name,handle,avatar_url,is_verified,account_type)')
    .eq('status', 'live')
    .gte('started_at', since)
    .order('viewer_count', { ascending: false })
    .order('started_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return (data as unknown as LiveRow[]) ?? [];
}

/** Met à jour le nombre de spectateurs (heartbeat). */
export async function setLiveViewers(id: string, n: number): Promise<void> {
  await supabase.from('lives').update({ viewer_count: Math.max(0, n) }).eq('id', id);
}

// ---- Messagerie directe ----
export type ChatPartner = { id: string; display_name: string | null; handle: string | null; avatar_url: string | null };
export type MsgKind = 'text' | 'image' | 'product' | 'voice' | 'video' | 'file';
export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  kind: MsgKind;
  text: string | null;
  media_url: string | null;
  product: any | null;
  file_name: string | null;
  duration: number | null;
  created_at: string;
  read_at: string | null;
};
export type ConvCategory = 'general' | 'store' | 'invitation';
export type Conversation = { otherId: string; other: ChatPartner | null; last: Message; unread: number; category: ConvCategory };

/** Mes conversations (dernier message par interlocuteur) + catégorie (général/store/invitation). */
export async function listConversations(): Promise<Conversation[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const [msgsRes, folRes] = await Promise.all([
    supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id,display_name,handle,avatar_url), recipient:profiles!messages_recipient_id_fkey(id,display_name,handle,avatar_url)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
  ]);
  const followingSet = new Set(((folRes.data ?? []) as any[]).map((r) => r.following_id));
  type Acc = Conversation & { _hasProduct: boolean; _iSent: boolean };
  const map = new Map<string, Acc>();
  for (const m of (msgsRes.data ?? []) as any[]) {
    const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
    const other = m.sender_id === user.id ? m.recipient : m.sender;
    if (!map.has(otherId)) map.set(otherId, { otherId, other, last: m, unread: 0, category: 'general', _hasProduct: false, _iSent: false });
    const c = map.get(otherId)!;
    if (m.recipient_id === user.id && !m.read_at) c.unread++;
    if (m.kind === 'product') c._hasProduct = true;
    if (m.sender_id === user.id) c._iSent = true;
  }
  return [...map.values()].map((c) => {
    let category: ConvCategory = 'general';
    if (c._hasProduct) category = 'store'; // conversation autour d'un article/produit
    else if (!followingSet.has(c.otherId) && !c._iSent) category = 'invitation'; // demande d'un non-abonné, pas encore répondu
    return { otherId: c.otherId, other: c.other, last: c.last, unread: c.unread, category };
  });
}

/** Fil de discussion avec un interlocuteur (chronologique). */
export async function getThread(otherId: string): Promise<Message[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`)
    .order('created_at', { ascending: true })
    .limit(500);
  return (data as Message[]) ?? [];
}

/** Envoie un message. Renvoie null si refusé (confidentialité). */
export async function sendMessage(recipientId: string, input: { kind?: MsgKind; text?: string; media_url?: string; product?: any; file_name?: string; duration?: number }): Promise<Message | null> {
  const sender_id = await requireUserId();
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id, recipient_id: recipientId, kind: input.kind ?? 'text', text: input.text ?? null, media_url: input.media_url ?? null, product: input.product ?? null, file_name: input.file_name ?? null, duration: input.duration ?? null })
    .select()
    .single();
  if (error) return null;
  return data as Message;
}

/** Marque comme lus les messages reçus de cet interlocuteur. */
export async function markThreadRead(otherId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('recipient_id', user.id).eq('sender_id', otherId).is('read_at', null);
}

/** Puis-je écrire à ce compte ? (pré-vérif confidentialité côté client) */
export async function canMessage(recipientId: string): Promise<{ ok: boolean; reason?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'Connecte-toi pour envoyer un message.' };
  if (user.id === recipientId) return { ok: true };
  const { data: prof } = await supabase.from('profiles').select('messages_from').eq('id', recipientId).maybeSingle();
  const pref = (prof?.messages_from as string) || 'everyone';
  if (pref === 'everyone') return { ok: true };
  // déjà en conversation ?
  const { count: existing } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender_id', recipientId).eq('recipient_id', user.id);
  if ((existing ?? 0) > 0) return { ok: true };
  if (pref === 'followers') {
    const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id).eq('following_id', recipientId);
    return (count ?? 0) > 0 ? { ok: true } : { ok: false, reason: "Ce compte n'accepte les messages que de ses abonnés." };
  }
  return { ok: false, reason: "Ce compte n'accepte pas les nouveaux messages." };
}

// ---- Reposts (republications publiques) ----
export type RepostRow = { id: string; reposter_id: string; post_id: string; payload: any; created_at: string };

/** Crée/remplace un repost (1 par publication). Renvoie la ligne créée. */
export async function createRepostDB(post_id: string, payload: any): Promise<RepostRow | null> {
  const me = await requireUserId();
  const { data, error } = await supabase
    .from('reposts')
    .upsert({ reposter_id: me, post_id, payload }, { onConflict: 'reposter_id,post_id' })
    .select()
    .single();
  if (error) return null;
  return data as RepostRow;
}

/** Reposts d'un compte (publics). */
export async function listRepostsByOwner(ownerId: string): Promise<RepostRow[]> {
  const { data } = await supabase.from('reposts').select('*').eq('reposter_id', ownerId).order('created_at', { ascending: false }).limit(60);
  return (data as RepostRow[]) ?? [];
}

/** Mes reposts. */
export async function listMyReposts(): Promise<RepostRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return listRepostsByOwner(user.id);
}

export async function updateRepostDB(id: string, payload: any): Promise<void> {
  const { error } = await supabase.from('reposts').update({ payload }).eq('id', id);
  if (error) throw error;
}

export async function deleteRepostDB(id: string): Promise<void> {
  const { error } = await supabase.from('reposts').delete().eq('id', id);
  if (error) throw error;
}

// ---- Suivi (follow / unfollow) ----
/** Est-ce que je suis ce compte ? false si non connecté / soi-même. */
export async function isFollowing(targetId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id === targetId) return false;
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', user.id)
    .eq('following_id', targetId);
  return (count ?? 0) > 0;
}

/** Suivre un compte (idempotent). */
export async function followUser(targetId: string): Promise<void> {
  const me = await requireUserId();
  if (me === targetId) return;
  const { error } = await supabase.from('follows').upsert({ follower_id: me, following_id: targetId }, { onConflict: 'follower_id,following_id' });
  if (error) throw error;
}

/** Ne plus suivre un compte. */
export async function unfollowUser(targetId: string): Promise<void> {
  const me = await requireUserId();
  const { error } = await supabase.from('follows').delete().eq('follower_id', me).eq('following_id', targetId);
  if (error) throw error;
}

/** Ids des comptes que je suis (léger, pour l'état des boutons Suivre). */
export async function myFollowingIds(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
  return ((data ?? []) as any[]).map((r) => r.following_id);
}

/** Créateurs/vendeurs à découvrir (vitrine). */
export async function listCreators(limit = 20): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .neq('account_type', 'buyer')
    .order('is_verified', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as Profile[]) ?? [];
}

/** Les comptes que JE suis (abonnements). PRIVÉ : uniquement pour moi-même. */
export async function listMyFollowing(): Promise<Profile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('follows')
    .select('profile:profiles!follows_following_id_fkey(*)')
    .eq('follower_id', user.id)
    .limit(300);
  return ((data ?? []) as any[]).map((r) => r.profile).filter(Boolean) as Profile[];
}

/** Les comptes qui ME suivent (abonnés). PRIVÉ : uniquement pour moi-même. */
export async function listMyFollowers(): Promise<Profile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('follows')
    .select('profile:profiles!follows_follower_id_fkey(*)')
    .eq('following_id', user.id)
    .limit(300);
  return ((data ?? []) as any[]).map((r) => r.profile).filter(Boolean) as Profile[];
}

export type SearchPost = {
  id: string;
  thumbnail_url: string | null;
  media_url: string | null;
  caption: string | null;
  kind: string;
  author: { display_name: string | null; handle: string | null; avatar_url: string | null } | null;
};

/** Recherche de vidéos/posts (média) par légende. */
export async function searchPosts(q: string): Promise<SearchPost[]> {
  const term = q.trim().replace(/^#/, '').replace(/[,()%*]/g, ' ').trim();
  let req = supabase
    .from('posts')
    .select('id,thumbnail_url,media_url,caption,kind,author:profiles!posts_author_id_fkey(display_name,handle,avatar_url)')
    .neq('kind', 'text')
    .limit(40);
  if (term) req = req.ilike('caption', `%${term}%`);
  else req = req.order('created_at', { ascending: false });
  const { data, error } = await req;
  if (error) return [];
  return (data as unknown as SearchPost[]) ?? [];
}

export type CreatorData = {
  profile: Profile;
  posts: { id: string; thumbnail_url: string | null; media_url: string | null; kind: string; view_count: number; caption: string | null; created_at: string; like_count: number; comment_count: number }[];
  followers: number;
  views: number;
};

/** Profil + posts + abonnés d'un créateur (par handle). null si introuvable. */
export async function getCreatorData(handle: string): Promise<CreatorData | null> {
  const profile = await getProfileByHandle(handle);
  if (!profile) return null;
  const [postsRes, followersRes] = await Promise.all([
    supabase.from('posts').select('id,thumbnail_url,media_url,kind,view_count,caption,created_at,like_count,comment_count').eq('author_id', profile.id).order('created_at', { ascending: false }).limit(60),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
  ]);
  const posts = postsRes.data ?? [];
  return {
    profile,
    posts,
    followers: followersRes.count ?? 0,
    views: posts.reduce((s, p) => s + (p.view_count || 0), 0),
  };
}

// ---- Compte / sécurité ----
export async function getAccountInfo(): Promise<{ email: string | null; phone: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { email: user?.email ?? null, phone: (user as any)?.phone ?? null };
}

/** Change l'email (Supabase envoie un email de confirmation). */
export async function changeEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}

/** Change le mot de passe du compte connecté. */
export async function changePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/** Désactive le compte (données conservées) puis déconnecte. */
export async function deactivateAccount(): Promise<void> {
  const id = await requireUserId();
  await supabase.from('profiles').update({ is_active: false }).eq('id', id);
  await supabase.auth.signOut();
}

/** Supprime définitivement le compte et ses données (RGPD) puis déconnecte. */
export async function deleteAccount(): Promise<void> {
  await requireUserId();
  const { error } = await supabase.rpc('delete_user');
  if (error) throw error;
  await supabase.auth.signOut();
}

// ---- Upload d'image vers Supabase Storage ----
/** Upload une image locale (uri) et renvoie son URL publique. */
export async function uploadImage(bucket: 'avatars' | 'products' | 'media', uri: string): Promise<string> {
  const userId = await requireUserId();
  const resp = await fetch(uri);
  const arrayBuffer = await resp.arrayBuffer();
  const contentType = resp.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Upload un fichier (document/zip/pdf) — pour les produits digitaux. */
export async function uploadFile(uri: string, name: string): Promise<string> {
  const userId = await requireUserId();
  const resp = await fetch(uri);
  const arrayBuffer = await resp.arrayBuffer();
  const contentType = resp.headers.get('content-type') || 'application/octet-stream';
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/files/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from('media').upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

// ---- Produits ----
export type ProductInput = {
  title: string;
  kind?: 'physical' | 'digital';
  price_cfa: number;
  promo_cfa?: number | null;
  stock: number;
  commission_pct: number;
  description?: string;
  image_url?: string | null;
  images?: string[];
  digital_file_url?: string | null;
  quantity_tiers?: { qty: number; price_cfa: number }[];
};

export async function listMyProducts(): Promise<Product[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Charge un produit par id (pour l'édition). null si introuvable. */
export async function getProduct(id: string): Promise<Product | null> {
  const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  return data;
}

export type FeedProduct = Product & {
  owner: { id: string; display_name: string | null; handle: string | null; avatar_url: string | null; is_verified: boolean; account_type: string } | null;
};

/** Feed shoppable : produits actifs + leur créateur, classés par popularité. */
export async function listFeedProducts(): Promise<FeedProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, owner:profiles!products_owner_id_fkey(id,display_name,handle,avatar_url,is_verified,account_type)')
    .eq('is_active', true)
    .order('sold_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) return [];
  return (data as FeedProduct[]) ?? [];
}

/** Produits d'un créateur (vue visiteur de sa boutique). */
export async function listProductsByOwner(ownerId: string): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const owner_id = await requireUserId();
  const { data, error } = await supabase
    .from('products')
    .insert({ owner_id, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, patch: Partial<ProductInput> & { is_active?: boolean }): Promise<void> {
  const { error } = await supabase.from('products').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

/** Supprime un post (RLS : seulement l'auteur). */
export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

/** Met à jour la légende d'un post (RLS : seulement l'auteur). */
export async function updatePostCaption(id: string, caption: string): Promise<void> {
  const { error } = await supabase.from('posts').update({ caption }).eq('id', id);
  if (error) throw error;
}

// ---- Commandes / gains (portefeuille réel) ----
/** Toutes les commandes où je suis vendeur OU revendeur (affilié). [] si non connecté. */
export async function listMyOrders(): Promise<Order[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .or(`seller_id.eq.${user.id},reseller_id.eq.${user.id}`)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data as Order[]) ?? [];
}

export type MyPost = {
  id: string;
  media_url: string | null;
  thumbnail_url: string | null;
  kind: string;
  caption: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
};

/** Tous mes posts (pour les onglets média + texte du profil). [] si non connecté. */
export async function getMyPosts(): Promise<MyPost[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('posts')
    .select('id,media_url,thumbnail_url,kind,caption,view_count,like_count,comment_count,created_at')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false });
  return (data as MyPost[]) ?? [];
}

/** Publie un post 100% texte (façon X). Renvoie le post créé. */
export async function createTextPost(caption: string): Promise<Post> {
  const author_id = await requireUserId();
  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id, kind: 'text', caption, media_url: null, thumbnail_url: null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export type ReachStats = {
  followers: number;
  following: number;
  posts: number;
  views: number;
  topPosts: { id: string; thumbnail_url: string | null; media_url: string | null; view_count: number }[];
};

/** Portée réelle du compte connecté (abonnés, abonnements, posts, vues). Tout à 0 pour un nouveau compte. */
export async function getMyReachStats(): Promise<ReachStats> {
  const empty: ReachStats = { followers: 0, following: 0, posts: 0, views: 0, topPosts: [] };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;
  const [postsRes, followersRes, followingRes] = await Promise.all([
    supabase.from('posts').select('id,thumbnail_url,media_url,view_count').eq('author_id', user.id).order('view_count', { ascending: false }),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
  ]);
  const posts = (postsRes.data ?? []) as ReachStats['topPosts'];
  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
    posts: posts.length,
    views: posts.reduce((s, p) => s + (p.view_count || 0), 0),
    topPosts: posts.slice(0, 5),
  };
}

// ---- Feed (posts + auteur + produits attachés) ----
export type FeedPost = Post & {
  author: Profile | null;
  post_products: { product: Product }[];
};

export async function listFeed(): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(*), post_products(product:products(*))')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data as FeedPost[]) ?? [];
}

export type CreatePostInput = {
  kind: 'image' | 'video' | 'story';
  caption?: string;
  media_url?: string | null;
  thumbnail_url?: string | null;
  productIds?: string[];
};

export async function createPost(input: CreatePostInput): Promise<Post> {
  const author_id = await requireUserId();
  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id,
      kind: input.kind,
      caption: input.caption,
      media_url: input.media_url,
      thumbnail_url: input.thumbnail_url,
    })
    .select()
    .single();
  if (error) throw error;

  // Attacher les produits (active le bouton « Acheter »)
  if (input.productIds?.length) {
    const rows = input.productIds.map((product_id) => ({ post_id: data.id, product_id }));
    const { error: linkErr } = await supabase.from('post_products').insert(rows);
    if (linkErr) throw linkErr;
  }
  return data;
}
