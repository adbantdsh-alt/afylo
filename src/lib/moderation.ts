/**
 * Afylo — moteur de modération (politique de contenu).
 *
 * Philosophie : liberté d'expression forte, mais des limites nettes.
 *  - INTERDIT  : bloqué, jamais publié (mineurs/CSAM, violence, illégal, doxxing)
 *  - SENSIBLE  : publié AVEC un avertissement + flou (adulte, choquant, clivant)
 *  - LIBRE     : publié normalement
 *
 * ⚠️ Ceci est une PREMIÈRE PASSE côté client (mots-clés). En production, elle doit
 * être doublée d'une modération serveur : IA de classification image/texte,
 * hash-matching (type PhotoDNA) pour le CSAM, revue humaine, et signalement
 * obligatoire aux autorités (NCMEC / police) pour tout contenu impliquant des mineurs.
 */

export type ModLevel = 'ok' | 'sensitive' | 'blocked';
export type ModResult = { level: ModLevel; category?: string; reason?: string };

// --- INTERDIT (bloqué) ---
const BLOCK: { category: string; reason: string; terms: RegExp }[] = [
  {
    category: 'mineurs',
    reason: "Contenu sexuel impliquant des mineurs — strictement interdit et signalé aux autorités.",
    // indicateurs texte (le vrai filtrage image se fait côté serveur par hash + IA)
    terms: /\b(mineur|enfant|petite? fille|petit gar[çc]on|coll[ée]gien|13\s*ans|14\s*ans|15\s*ans|16\s*ans)\b[^.]{0,40}\b(nu|sexe|sexuel|nue?)\b/i,
  },
  {
    category: 'violence',
    reason: 'Menace ou incitation à la violence / au terrorisme.',
    terms: /\b(je vais te tuer|mort aux|attentat|bombe artisanale|d[ée]capiter|massacrer)\b/i,
  },
  {
    category: 'illegal',
    reason: 'Vente de produits illégaux (armes, drogues, humains, contrefaçon dangereuse).',
    terms: /\b(vend(re|s)?|achat).{0,20}\b(arme[s]? à feu|kalash|coca[ïi]ne|h[ée]ro[ïi]ne|faux billets?|organe[s]?)\b/i,
  },
  {
    category: 'doxxing',
    reason: "Partage d'informations privées (doxxing).",
    terms: /\b(voici son (adresse|num[ée]ro)|adresse exacte de|carte d'identit[ée] de)\b/i,
  },
];

// --- SENSIBLE (autorisé avec avertissement) ---
const SENSITIVE: { category: string; reason: string; terms: RegExp }[] = [
  { category: 'adulte', reason: 'Contenu pour adultes / suggestif.', terms: /\b(nudit[ée]|nue?s?|sexy|lingerie|18\+|contenu adulte|explicite)\b/i },
  { category: 'choquant', reason: 'Images potentiellement choquantes (violence, sang).', terms: /\b(sang|blessure grave|accident|cadavre|gore|choquant)\b/i },
  { category: 'clivant', reason: 'Sujet sensible (politique, religion, tragédie).', terms: /\b(politique|[ée]lection|religion|guerre|attentat|mort de|drame)\b/i },
];

export function classifyText(text?: string | null): ModResult {
  const t = (text ?? '').trim();
  if (!t) return { level: 'ok' };
  for (const b of BLOCK) if (b.terms.test(t)) return { level: 'blocked', category: b.category, reason: b.reason };
  for (const s of SENSITIVE) if (s.terms.test(t)) return { level: 'sensitive', category: s.category, reason: s.reason };
  return { level: 'ok' };
}

/** Modération produit : bloque la vente d'articles interdits. */
export function classifyProduct(title?: string, description?: string): ModResult {
  return classifyText(`${title ?? ''} ${description ?? ''}`);
}

/** Motifs de signalement proposés à l'utilisateur. */
export const REPORT_REASONS = [
  'Contenu sexuel impliquant un mineur',
  'Violence ou menace',
  'Harcèlement',
  'Arnaque / faux produit',
  'Contenu choquant',
  'Discours haineux',
  'Autre',
];
