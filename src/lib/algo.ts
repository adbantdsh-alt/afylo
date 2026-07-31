/**
 * Afylo — moteur de recommandation vidéo (façon TikTok, adapté).
 *
 * Un bon algo garde l'utilisateur : il mélange VIRALITÉ (taux d'engagement),
 * ABONNEMENTS (créateurs suivis), AFFINITÉ DE NICHE (ce que tu choisis / regardes),
 * FRAÎCHEUR, et il enlève ce que tu as marqué « pas intéressé ».
 */
import type { Post } from '@/lib/mock';

export const NICHES = ['ASMR', 'Mode', 'Beauté', 'Cuisine', 'Tech', 'Sport', 'Humour', 'Musique', 'Danse', 'Business'];

export type FeedCtx = {
  following?: string[];      // handles suivis
  niche?: string | null;     // niche choisie par l'utilisateur
  affinity?: Record<string, number>; // niches regardées (temps passé)
  notInterested?: string[];  // ids masqués
};

/** "7.2 K" -> 7200, "1.2 M" -> 1200000, "342" -> 342 */
function count(s?: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(',', '.'));
  if (/m/i.test(s)) return n * 1_000_000;
  if (/k/i.test(s)) return n * 1_000;
  return n || 0;
}

/** Score de recommandation d'une vidéo pour un contexte donné. */
export function scorePost(p: Post, ctx: FeedCtx = {}): number {
  if (ctx.notInterested?.includes(p.id)) return -1;

  const likes = count(p.likes);
  const comments = count(p.comments);
  const shares = count(p.shares);
  const views = Math.max(count(p.views), 1);

  // Engagement pondéré (un partage vaut plus qu'un like)
  const engagement = likes + comments * 3 + shares * 6;
  // Taux de viralité = engagement / vues (une petite vidéo très engageante remonte)
  const virality = engagement / views;

  let score = Math.log10(engagement + 1) * 40 + virality * 6000;

  // Abonnement : boost fort pour les créateurs suivis
  if (p.handle && ctx.following?.includes(p.handle)) score += 3500;

  // Niche choisie / affinité
  const niche = (p as any).niche as string | undefined;
  if (niche && ctx.niche && niche === ctx.niche) score += 9000;
  if (niche && ctx.affinity?.[niche]) score += Math.min(ctx.affinity[niche], 20) * 120;

  return score;
}

/** Classe les vidéos selon l'algo (retire les « pas intéressé »). */
export function rankPosts(posts: Post[], ctx: FeedCtx = {}): Post[] {
  return posts
    .map((p) => ({ p, s: scorePost(p, ctx) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}
