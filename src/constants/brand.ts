/**
 * Afylo — système de design (v2, clair & éditorial)
 * « Là où l'Afrique crée, vend et gagne. »
 *
 * Direction : fond crème chaud, texte encre, UN seul accent (persimmon —
 * chaleur africaine) au lieu du violet générique. Verre dépoli sur la nav.
 */
export const Afylo = {
  // Fonds (clairs)
  bg: '#F4EFE6', // crème chaud
  surface: '#FFFFFF',
  surfaceAlt: '#EBE3D6', // beige clair
  card: '#FFFFFF',
  border: '#E4DCCC',

  // Texte
  text: '#1C1712', // encre
  textDim: '#6E6456',
  textFaint: '#AB9F8C',
  ink: '#1C1712', // texte sur carte blanche
  inkDim: '#6E6456',

  // Accent principal = bleu (clé "violet" conservée pour compat)
  violet: '#3E5BFF', // bleu Afylo
  violet2: '#6E80FF', // bleu clair (dégradés discrets)
  gold: '#B8791F', // argent / prix
  live: '#E11D48', // live (rose-rouge)
  green: '#1F7A4D', // payé / gains

  // Verre (liquid glass)
  glass: 'rgba(255,255,255,0.6)',
  glassBorder: 'rgba(255,255,255,0.7)',
  glassShadow: 'rgba(28,23,18,0.14)',
} as const;

/** Familles de police (Bricolage Grotesque, chargées au démarrage). */
export const Font = {
  regular: 'BricolageGrotesque_400Regular',
  medium: 'BricolageGrotesque_500Medium',
  semibold: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_700Bold',
  extrabold: 'BricolageGrotesque_800ExtraBold',
} as const;

export const Radius = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
