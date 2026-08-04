/**
 * Convertit les données Supabase (FeedPost) vers les formes attendues par l'UI
 * existante (cartes de l'accueil `Post`, grille d'explore `ExploreItem`).
 * Permet de brancher le vrai réseau sans réécrire les composants.
 */
import { verifiedKind } from '@/components/verified';
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

/** Borne la proportion d'un média (largeur/hauteur) pour éviter les extrêmes.
 *  0.56 ≈ 9:16 (portrait plein) · 1.91 ≈ paysage large (comme Instagram). */
export const clampRatio = (r: number) => Math.max(0.56, Math.min(1.91, r));

/** Vrai fichier vidéo (upload réel) — évite de traiter les vieux posts « vidéo » à vignette image comme des vidéos. */
const looksLikeVideo = (u?: string | null) =>
  !!u && (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(u) || u.includes('/storage/v1/object'));

/** Hash déterministe d'un id → mélange stable (même ordre partout, évite de regrouper un même auteur). */
export function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
const byHash = <T extends { id: string }>(a: T, b: T) => hashId(a.id) - hashId(b.id);

/** FeedPost (DB) → carte de l'accueil. */
export function mapFeedPost(fp: FeedPost): Post {
  const a = fp.author;
  const prods = (fp.post_products ?? []).map((pp) => pp.product).filter(Boolean);
  const first = prods[0];
  const isText = fp.kind === 'text' || (!fp.media_url && !fp.thumbnail_url);
  return {
    id: fp.id,
    authorId: fp.author_id ?? a?.id,
    name: a?.display_name || a?.handle || 'Créateur',
    handle: a?.handle ? `@${a.handle}` : '@afylo',
    avatar: a?.avatar_url || avatar(0),
    verified: verifiedKind(a),
    badge: a?.account_type === 'merchant' ? 'boutique' : 'créateur',
    time: timeAgo(fp.created_at),
    image: isText ? '' : fp.thumbnail_url || fp.media_url || photo(fp.id, 700, 800),
    images: !isText && fp.media_urls && fp.media_urls.length > 1 ? fp.media_urls : undefined,
    ratio: fp.aspect_ratio ? clampRatio(fp.aspect_ratio) : undefined,
    video: fp.kind === 'video' && looksLikeVideo(fp.media_url) ? true : undefined,
    overlays: fp.overlays && fp.overlays.length ? fp.overlays : undefined,
    muted: fp.muted ?? undefined,
    textOnly: isText || undefined,
    likes: fmtCount(fp.like_count),
    comments: fmtCount(fp.comment_count),
    views: fmtCount(fp.view_count),
    shares: fmtCount(Math.round((fp.like_count ?? 0) / 12)),
    caption: fp.caption || '',
    product: first
      ? {
          title: first.title,
          price: formatCfa(first.promo_cfa ?? first.price_cfa),
          priceOld: first.promo_cfa && first.promo_cfa < first.price_cfa ? formatCfa(first.price_cfa) : undefined, // prix barré si promo
          commission: pct(first.commission_pct),
          priceCfa: first.promo_cfa ?? first.price_cfa,
          tiers: first.quantity_tiers,
        }
      : undefined,
    products: prods.length > 1 ? prods.map((p) => ({ title: p.title, price: formatCfa(p.promo_cfa ?? p.price_cfa) })) : undefined,
  };
}

/** FeedPost (DB) → item de la grille d'explore. */
export function mapExploreItem(fp: FeedPost): ExploreItem {
  const a = fp.author;
  const first = (fp.post_products ?? [])[0]?.product;
  return {
    id: fp.id,
    name: a?.display_name || a?.handle || 'Créateur',
    handle: a?.handle ?? undefined,
    verified: verifiedKind(a),
    label: a?.bio || fp.caption || 'Afylo',
    image: fp.thumbnail_url || fp.media_url || photo(fp.id, 500, 700),
    tall: hashId(fp.id) % 3 === 0,
    live: false,
    product: first ? { title: first.title, price: formatCfa(first.price_cfa) } : undefined,
  };
}

/**
 * Score algorithmique du feed : récence + engagement (commentaires > j'aime > vues).
 * Un post récent remonte tout de suite (tu vois ta publi en haut), et l'engagement
 * fait durer les bons posts. Inspiré du ranking « gravity » (HN).
 */
function feedScore(fp: FeedPost): number {
  const eng = (fp.like_count || 0) * 3 + (fp.comment_count || 0) * 5 + (fp.view_count || 0) * 0.1;
  const ageH = Math.max(0, (Date.now() - new Date(fp.created_at).getTime()) / 3_600_000);
  return (eng + 1) / Math.pow(ageH + 2, 1.5);
}
const byScore = (a: FeedPost, b: FeedPost) => feedScore(b) - feedScore(a);

/** Feed accueil : classé par l'algorithme (récence + engagement) — les posts récents remontent. */
export const mapFeed = (rows: FeedPost[]): Post[] => [...rows].sort(byScore).map(mapFeedPost);
/** Grille explore mappée + triée (média uniquement — pas les posts texte). */
export const mapExplore = (rows: FeedPost[]): ExploreItem[] =>
  rows.filter((fp) => fp.kind !== 'text' && (fp.media_url || fp.thumbnail_url)).map(mapExploreItem).sort(byHash);
