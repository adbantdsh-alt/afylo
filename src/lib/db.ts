/**
 * Couche d'accès aux données Afryko (Supabase).
 * Les écritures passent par RLS : owner_id / author_id doivent = auth.uid().
 */
import { supabase } from './supabase';
import type { Post, Product, Profile } from '@/types/db';

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
  website?: string | null;
  account_type?: 'creator' | 'merchant' | 'buyer';
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

// ---- Feed (posts + auteur + produits attachés) ----
export type FeedPost = Post & {
  author: Profile | null;
  post_products: { product: Product }[];
};

export async function listFeed(): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, author:profiles(*), post_products(product:products(*))')
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
