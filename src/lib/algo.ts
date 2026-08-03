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

/* ------------------------------------------------------------------ *
 *  Afylo Creator Rewards — rémunération des créateurs à la vue
 * ------------------------------------------------------------------ */

/** Barème officiel : 100 FCFA pour 1 000 vues qualifiées. */
export const REWARD_PER_1K_FCFA = 100;
/** Seuil minimum de paiement. */
export const PAYOUT_MIN_FCFA = 10_000;
/** Une vue compte à partir de 8 s OU 30 % de la durée regardée. */
export const QUALIFY_MIN_SECONDS = 8;
export const QUALIFY_MIN_PCT = 0.3;

/** Détermine si une vue est « qualifiée » (donc rémunérable). */
export function isQualifiedView(v: {
  watchedSeconds: number;
  durationSeconds: number;
  realUser: boolean; // utilisateur réel (pas bot/ferme à clics)
  vpnFraud?: boolean;
  repeatBySameUser?: boolean; // relecture par le même utilisateur
}): boolean {
  if (!v.realUser || v.vpnFraud || v.repeatBySameUser) return false;
  const threshold = Math.min(QUALIFY_MIN_SECONDS, v.durationSeconds * QUALIFY_MIN_PCT);
  return v.watchedSeconds >= threshold;
}

/** Revenu créateur (FCFA) pour un nombre de vues qualifiées. */
export function viewsEarning(qualifiedViews: number): number {
  return Math.floor(Math.max(0, qualifiedViews) / 1000) * REWARD_PER_1K_FCFA;
}

export type RewardsEligibility = {
  followers: number;
  videos30d: number;
  qualifiedViews30d: number;
  age18: boolean;
  kyc: boolean;
  hasPayout: boolean; // XaalisPay / moyen compatible
};
export type EligibilityCheck = { key: string; label: string; ok: boolean; value: string; need: string };

/** Vérifie chaque condition d'éligibilité au programme. */
export function checkEligibility(e: RewardsEligibility): EligibilityCheck[] {
  const fmt = (n: number) => n.toLocaleString('fr-FR');
  return [
    { key: 'followers', label: 'Abonnés', ok: e.followers >= 5000, value: fmt(e.followers), need: '5 000 min' },
    { key: 'videos', label: 'Vidéos originales (30 j)', ok: e.videos30d >= 10, value: `${e.videos30d}`, need: '10 min' },
    { key: 'views', label: 'Vues qualifiées (30 j)', ok: e.qualifiedViews30d >= 50000, value: fmt(e.qualifiedViews30d), need: '50 000 min' },
    { key: 'age', label: '18 ans ou plus', ok: e.age18, value: e.age18 ? 'Oui' : 'Non', need: 'Requis' },
    { key: 'kyc', label: "Vérification d'identité (KYC)", ok: e.kyc, value: e.kyc ? 'Validée' : 'À faire', need: 'Requis' },
    { key: 'payout', label: 'Moyen de paiement', ok: e.hasPayout, value: e.hasPayout ? 'Configuré' : 'À ajouter', need: 'XaalisPay/…' },
  ];
}
export const isEligible = (e: RewardsEligibility) => checkEligibility(e).every((c) => c.ok);
