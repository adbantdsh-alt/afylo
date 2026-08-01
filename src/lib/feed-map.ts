/**
 * Convertit les données Supabase (FeedPost) vers les formes attendues par l'UI
 * existante (cartes de l'accueil `Post`, grille d'explore `ExploreItem`).
 * Permet de brancher le vrai réseau sans réécrire les composants.
 */
import type { FeedPost } from '@/lib/db';
import { avatar, photo, type ExploreItem, type Post } from '@/lib/mock';
import { formatCfa } from '@/types/db';

export function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function fmtCount(n: number): string {
  if (!n || n < 0) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + ' K';
  return String(n);
}

const pct = (n?: number | null) => (n && n > 0 ? `${Math.round(n)}%` : undefined);

/** FeedPost (DB) → carte de l'accueil. */
export function mapFeedPost(fp: FeedPost): Post {
  const a = fp.author;
  const prods = (fp.post_products ?? []).map((pp) => pp.product).filter(Boolean);
  const first = prods[0];
  return {
    id: fp.id,
    name: a?.display_name || a?.handle || 'Créateur',
    handle: a?.handle ? `@${a.handle}` : '@afryko',
    avatar: a?.avatar_url || avatar(0),
    badge: a?.account_type === 'merchant' ? 'boutique' : 'créateur',
    time: timeAgo(fp.created_at),
    image: fp.thumbnail_url || fp.media_url || photo(fp.id, 700, 800),
    likes: fmtCount(fp.like_count),
    comments: fmtCount(fp.comment_count),
    views: fmtCount(fp.view_count),
    shares: fmtCount(Math.round((fp.like_count ?? 0) / 12)),
    caption: fp.caption || '',
    product: first ? { title: first.title, price: formatCfa(first.price_cfa), commission: pct(first.commission_pct) } : undefined,
    products: prods.length > 1 ? prods.map((p) => ({ title: p.title, price: formatCfa(p.price_cfa) })) : undefined,
  };
}

/** FeedPost (DB) → item de la grille d'explore. */
export function mapExploreItem(fp: FeedPost, i: number): ExploreItem {
  const a = fp.author;
  const first = (fp.post_products ?? [])[0]?.product;
  return {
    id: fp.id,
    name: a?.display_name || a?.handle || 'Créateur',
    label: a?.bio || fp.caption || 'Afryko',
    image: fp.thumbnail_url || fp.media_url || photo(fp.id, 500, 700),
    tall: i % 3 === 0,
    live: false,
    product: first ? { title: first.title, price: formatCfa(first.price_cfa) } : undefined,
  };
}
