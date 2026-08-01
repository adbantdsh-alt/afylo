/**
 * Afryko — système de design (clair + sombre).
 * « Là où l'Afrique crée, vend et gagne. »
 *
 * Le thème est résolu AU CHARGEMENT (les couleurs sont figées dans les
 * StyleSheet). Changer de thème enregistre la préférence puis recharge l'app
 * (voir applyThemePref) — c'est ce qui rend le mode sombre réellement effectif.
 */
import { Appearance, Platform } from 'react-native';

export type ThemePref = 'light' | 'dark' | 'system';
export type ThemeMode = 'light' | 'dark';
export type Palette = typeof lightPalette;

const lightPalette = {
  // Fonds — blanc pur façon Instagram
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F2F2', // gris très clair (thumbs/skeleton)
  card: '#FFFFFF',
  border: '#DBDBDB', // gris de séparation Instagram

  // Texte
  text: '#0A0A0A', // noir
  textDim: '#737373', // gris secondaire
  textFaint: '#A8A8A8', // gris clair
  ink: '#0A0A0A',
  inkDim: '#737373',

  // Accent principal = bleu
  violet: '#3E5BFF',
  violet2: '#6E80FF',
  gold: '#B8791F',
  live: '#E11D48',
  green: '#1F7A4D',

  // Nav bar sombre (contraste avec le contenu blanc)
  navBg: '#0B0B0F',
  navBorder: '#1E1E24',

  // (héritage) surfaces solides — plus de verre
  glass: '#FFFFFF',
  glassBorder: '#DBDBDB',
  glassShadow: 'rgba(0,0,0,0.12)',
};

const darkPalette: Palette = {
  // Fonds — noir façon X/Twitter
  bg: '#000000',
  surface: '#16181C',
  surfaceAlt: '#22252B',
  card: '#16181C',
  border: '#2A2E35',

  // Texte
  text: '#F5F6F7',
  textDim: '#9BA1A8',
  textFaint: '#6B7178',
  ink: '#F5F6F7',
  inkDim: '#9BA1A8',

  // Accent — bleu légèrement éclairci pour le contraste sur fond noir
  violet: '#5B79FF',
  violet2: '#8496FF',
  gold: '#E0A94A',
  live: '#FF4D6D',
  green: '#2FBE7A',

  // Nav bar
  navBg: '#000000',
  navBorder: '#16181C',

  glass: '#16181C',
  glassBorder: '#2A2E35',
  glassShadow: 'rgba(0,0,0,0.5)',
};

const THEME_KEY = 'afryko-theme';

/** Lecture SYNCHRONE de la préférence (web: localStorage). Défaut: 'system'. */
function readThemePref(): ThemePref {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const v = window.localStorage.getItem(THEME_KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
    }
  } catch {}
  return 'system';
}

function systemMode(): ThemeMode {
  try {
    return Appearance.getColorScheme?.() === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

const pref = readThemePref();
/** Mode résolu au chargement ('light' | 'dark'). */
export const THEME_MODE: ThemeMode = pref === 'system' ? systemMode() : pref;
export const isDark = THEME_MODE === 'dark';

/** Palette active de l'app (figée au chargement). */
export const Afryko: Palette = THEME_MODE === 'dark' ? darkPalette : lightPalette;

/** Préférence enregistrée ('light' | 'dark' | 'system'). */
export function getThemePref(): ThemePref {
  return readThemePref();
}

/** Enregistre la préférence de thème et l'applique (recharge sur le web). */
export function applyThemePref(p: ThemePref) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.localStorage) window.localStorage.setItem(THEME_KEY, p);
      window.location.reload(); // recharge → StyleSheet recalculés avec la nouvelle palette
      return;
    }
  } catch {}
  // Natif : on mémorise (best-effort) ; « Système » suit l'apparence de l'appareil.
  import('@react-native-async-storage/async-storage').then((m) => m.default.setItem(THEME_KEY, p)).catch(() => {});
}

/** Familles de police — Inter (naturelle, moderne, non « géométrique/IA »). */
export const Font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/**
 * Échelle typographique (spec premium). À étaler dans les styles :
 *   <Text style={[Type.name, { color: Afryko.text }]}>…</Text>
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
