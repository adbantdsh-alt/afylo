/**
 * Afylo — identité de marque
 * « Là où l'Afrique crée, vend et gagne. »
 *
 * Thème sombre premium (contenu court + live shopping),
 * accent violet = marque/action, doré = argent/créateur, rouge = live.
 */
export const Afylo = {
  // Fonds
  bg: '#0B0B14',
  surface: '#15151F',
  surfaceAlt: '#1E1E2B',
  card: '#FFFFFF',
  border: '#26263300',

  // Texte (sur fond sombre)
  text: '#FFFFFF',
  textDim: '#9A9AB0',
  textFaint: '#5B5B6E',

  // Texte (sur carte claire)
  ink: '#12121A',
  inkDim: '#6B6B7B',

  // Accents
  violet: '#5468FF', // marque / bouton principal
  violet2: '#7C5CFF',
  gold: '#FFB020', // argent / prix / rémunération
  live: '#FF2D55', // live / direct
  green: '#00C566', // payé / succès (escrow libéré)
} as const;

export const Radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
