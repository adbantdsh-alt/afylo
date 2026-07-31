/**
 * Types de la base de données Afylo (miroir de supabase/migrations/0001_init.sql).
 * À terme, remplaçables par les types générés :
 *   npx supabase gen types typescript --project-id uxtnmvyqwoklspffjbdn > src/types/db.ts
 */

export type AccountType = 'creator' | 'merchant' | 'buyer';
export type PostKind = 'image' | 'video' | 'story';
export type LiveStatus = 'scheduled' | 'live' | 'ended';
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'released'
  | 'cancelled';

export interface Profile {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  account_type: AccountType;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  kind: 'physical' | 'digital';
  price_cfa: number;
  promo_cfa: number | null;
  currency: string;
  stock: number;
  image_url: string | null;
  images: string[];
  digital_file_url: string | null;
  quantity_tiers: { qty: number; price_cfa: number }[];
  commission_pct: number;
  is_active: boolean;
  sold_count: number;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  kind: PostKind;
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  duration_seconds: number | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
}

export interface PostProduct {
  post_id: string;
  product_id: string;
}

export interface Live {
  id: string;
  host_id: string;
  title: string | null;
  status: LiveStatus;
  thumbnail_url: string | null;
  viewer_peak: number;
  revenue_cfa: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  reseller_id: string | null;
  product_id: string;
  quantity: number;
  amount_cfa: number;
  commission_cfa: number;
  platform_fee_cfa: number;
  status: OrderStatus;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

/** Commission Afylo prélevée sur chaque vente (5%). */
export const AFYLO_FEE_PCT = 5;

/** Formatte un montant en FCFA : 18500 → "18 500 FCFA". */
export function formatCfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`;
}
