/**
 * Couche d'accès aux données Afylo (Supabase).
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

// ---- Produits ----
export type ProductInput = {
  title: string;
  price_cfa: number;
  stock: number;
  commission_pct: number;
  description?: string;
  image_url?: string | null;
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
