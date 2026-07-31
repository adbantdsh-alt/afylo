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

  // Texte (neutres premium, façon Instagram / Airbnb)
  text: '#111111', // titres, noms
  textDim: '#7A7A7A', // labels, secondaire
  textFaint: '#8A8A8A', // captions
  ink: '#111111', // texte sur carte blanche
  inkDim: '#7A7A7A',

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

/** Familles de police — Inter (naturelle, moderne, non « géométrique/IA »). */
export const Font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/**
 * Échelle typographique (spec premium). À étaler dans les styles :
 *   <Text style={[Type.name, { color: Afylo.text }]}>…</Text>
 * On utilise fontFamily par graisse (Inter a de vraies graisses),
 * jamais fontWeight, pour un rendu net et cohérent iOS/Android/web.
 */
export const Type = {
  title: { fontFamily: Font.bold, fontSize: 22, letterSpacing: -0.3 },
  subtitle: { fontFamily: Font.semibold, fontSize: 18, letterSpacing: -0.2 },
  username: { fontFamily: Font.semibold, fontSize: 28, letterSpacing: -0.4 },
  name: { fontFamily: Font.bold, fontSize: 22, letterSpacing: -0.3 },
  badge: { fontFamily: Font.medium, fontSize: 12, letterSpacing: 0 },
  bio: { fontFamily: Font.regular, fontSize: 16, lineHeight: 24 },
  statNumber: { fontFamily: Font.bold, fontSize: 24, letterSpacing: -0.3 },
  statLabel: { fontFamily: Font.medium, fontSize: 13 },
  button: { fontFamily: Font.semibold, fontSize: 17, letterSpacing: -0.1 },
  body: { fontFamily: Font.regular, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: Font.medium, fontSize: 13 },
  caption: { fontFamily: Font.regular, fontSize: 12 },
  navLabel: { fontFamily: Font.medium, fontSize: 12 },
} as const;

export const Radius = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
