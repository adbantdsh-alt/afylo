/**
 * Monétisation & éligibilité géographique (Afylo).
 *
 * Politique (rappel — la plupart se vérifie CÔTÉ SERVEUR : comptage des vues,
 * détection de bots, géo-IP, modération) :
 *  - Vues qualifiées : vidéo originale, ≥ 1 min, spectateur regarde ≥ 10 s,
 *    1 personne = 1 vue / période, pas de bots, compte actif connecté,
 *    vue depuis un pays africain éligible, contenu conforme aux règles.
 *  - RPM = 50 FCFA / 1000 vues qualifiées.
 *  - Retrait des gains : créateur majeur (18+) avec identité vérifiée.
 *    (Les spectateurs, eux, n'ont pas d'obligation d'âge stricte.)
 */

/** Revenu pour 1000 vues qualifiées, en FCFA. */
export const RPM_CFA = 50;

/** Gain estimé (FCFA) pour un nombre de vues qualifiées. */
export const earningsForViews = (qualifiedViews: number) => Math.round((qualifiedViews / 1000) * RPM_CFA);

/** Pays africains éligibles à la rémunération. */
export const AFRICAN_COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'CD', name: 'RD Congo', flag: '🇨🇩' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'CV', name: 'Cap-Vert', flag: '🇨🇻' },
  { code: 'GM', name: 'Gambie', flag: '🇬🇲' },
  { code: 'MR', name: 'Mauritanie', flag: '🇲🇷' },
];

export const isEligibleCountry = (code?: string | null) => !!code && AFRICAN_COUNTRIES.some((c) => c.code === code);

/** Vrai drapeau (image PNG) — rend partout, contrairement aux emoji-drapeaux non supportés sur Windows/web. */
export const flagUrl = (code: string) => `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
export const countryName = (code?: string | null) => AFRICAN_COUNTRIES.find((c) => c.code === code)?.name ?? '';

/** Indicatifs téléphoniques (pour le champ à l'inscription). */
export const DIAL_CODES: Record<string, string> = {
  SN: '+221', CI: '+225', ML: '+223', BF: '+226', GN: '+224', BJ: '+229', TG: '+228', NE: '+227',
  CM: '+237', GA: '+241', CG: '+242', CD: '+243', NG: '+234', GH: '+233', MA: '+212', DZ: '+213',
  TN: '+216', KE: '+254', CV: '+238', GM: '+220', MR: '+222',
};
