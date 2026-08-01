import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/ui-kit';
import { Afryko, Font, Radius } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { avatar } from '@/lib/mock';

const FEATURES = [
  { icon: 'videocam', color: '#3E5BFF', title: 'Vidéos & Lives', desc: "Publie des vidéos courtes, passe en live et deviens viral grâce à un algo qui met en avant les talents." },
  { icon: 'bag-handle', color: '#16A34A', title: 'Live Shopping', desc: 'Vends tes produits en direct pendant tes lives. Ton audience achète en un clic, sans quitter le live.' },
  { icon: 'cash', color: '#B8791F', title: 'Creator Rewards', desc: 'Sois rémunéré pour tes vues : 100 FCFA pour 1 000 vues qualifiées, versé chaque mois.' },
  { icon: 'card', color: '#6E80FF', title: 'Paiements mobile money', desc: 'Wave, Orange Money & XaalisPay. Argent bloqué en séquestre jusqu\'à la livraison — zéro arnaque.' },
  { icon: 'repeat', color: '#E11D48', title: 'Affiliation & repartage', desc: 'Republie les produits d\'autres vendeurs et touche une commission sur chaque vente via ton lien.' },
  { icon: 'shield-checkmark', color: '#1F7A4D', title: 'Communauté saine', desc: 'Liberté d\'expression, modération claire, tolérance zéro pour les contenus interdits.' },
] as const;

const STATS = [
  { v: '100 F', l: '/ 1 000 vues' },
  { v: '5%', l: 'commission max' },
  { v: '24h', l: 'paiement rapide' },
];

export default function Landing() {
  const router = useRouter();
  const { enterGuest } = useAuth();

  const explore = () => { enterGuest(); router.replace('/accueil'); };
  const login = () => router.push('/login');

  return (
    <View style={styles.root}>
      {/* Barre de nav fixe — connexion toujours accessible */}
      <SafeAreaView edges={['top']} style={styles.navWrap}>
        <View style={styles.nav}>
          <Text style={styles.brand}>Afryko<Text style={{ color: Afryko.violet }}>.</Text></Text>
          <Pressable style={styles.navLogin} onPress={login}>
            <Text style={styles.navLoginText}>Se connecter</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          {/* Hero */}
          <LinearGradient colors={['#EEF1FF', Afryko.bg]} style={styles.heroGlow} pointerEvents="none" />
          <View style={styles.collage}>
            <Tile n={0} size={92} top={10} left={12} r={-6} />
            <Tile n={1} size={118} top={0} left={120} r={4} />
            <Tile n={2} size={100} top={108} left={0} r={5} />
            <Tile n={6} size={124} top={116} left={112} r={-4} ring />
            <Tile n={8} size={88} top={236} left={34} r={6} />
            <Tile n={11} size={98} top={226} left={150} r={-5} ring />
          </View>

          <Text style={styles.title}>Crée. Vends. Gagne.</Text>
          <Text style={styles.sub}>La plateforme sociale où l'Afrique crée, vend et gagne. Publie tes vidéos, lance tes lives et vends directement à ton audience.</Text>

          <PillButton label="Ouvrir l'app" icon="arrow-forward" onPress={explore} style={{ marginTop: 24 }} />
          <PillButton label="Créer un compte" variant="ghost" onPress={login} style={{ marginTop: 12 }} />
          <Text style={styles.loginLine} onPress={login}>J'ai déjà un compte <Text style={{ color: Afryko.violet, fontFamily: Font.bold }}>Se connecter</Text></Text>

          {/* Bandeau stats */}
          <View style={styles.statBand}>
            {STATS.map((s, i) => (
              <View key={s.l} style={[styles.stat, i < STATS.length - 1 && styles.statBorder]}>
                <Text style={styles.statV}>{s.v}</Text>
                <Text style={styles.statL}>{s.l}</Text>
              </View>
            ))}
          </View>

          {/* Fonctionnalités */}
          <Text style={styles.sectionEyebrow}>Tout-en-un</Text>
          <Text style={styles.sectionTitle}>Une seule app pour créer et gagner</Text>
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.feature}>
                <View style={[styles.featureIcon, { backgroundColor: f.color + '18' }]}>
                  <Ionicons name={f.icon as any} size={22} color={f.color} />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>

          {/* CTA final */}
          <LinearGradient colors={[Afryko.violet, Afryko.violet2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Prêt à monétiser ton audience ?</Text>
            <Text style={styles.ctaSub}>Rejoins les créateurs qui vivent déjà de leur contenu sur Afryko.</Text>
            <Pressable style={styles.ctaBtn} onPress={login}>
              <Text style={styles.ctaBtnText}>Commencer gratuitement</Text>
            </Pressable>
            <Pressable style={styles.ctaGhost} onPress={explore}>
              <Text style={styles.ctaGhostText}>Explorer sans compte</Text>
            </Pressable>
          </LinearGradient>

          <Text style={styles.footer}>Là où l'Afrique crée, vend et gagne. · © 2026 Afryko</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Tile({ n, size, top, left, r, ring }: { n: number; size: number; top: number; left: number; r: number; ring?: boolean }) {
  return (
    <View style={[styles.tile, { width: size, height: size * 1.15, top, left, transform: [{ rotate: `${r}deg` }] }]}>
      {ring && <LinearGradient colors={[Afryko.violet, Afryko.live]} style={StyleSheet.absoluteFill} />}
      <Image source={{ uri: avatar(n) }} style={[styles.tileImg, ring && { margin: 3, borderRadius: 24 }]} contentFit="cover" transition={300} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  navWrap: { backgroundColor: Afryko.bg + 'F2', borderBottomWidth: 1, borderBottomColor: Afryko.border, zIndex: 10 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 54 },
  brand: { color: Afryko.text, fontSize: 22, fontFamily: Font.bold, letterSpacing: -0.5 },
  navLogin: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Afryko.violet },
  navLoginText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },

  scroll: { alignItems: 'center', paddingBottom: 40 },
  container: { width: '100%', maxWidth: 560, paddingHorizontal: 24, alignItems: 'stretch' },

  heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 460 },
  collage: { height: 360, marginTop: 20, alignSelf: 'center', width: 280 },
  tile: { position: 'absolute', borderRadius: 26, overflow: 'hidden', backgroundColor: Afryko.surfaceAlt },
  tileImg: { flex: 1, borderRadius: 26 },

  title: { color: Afryko.text, fontSize: 38, fontFamily: Font.bold, letterSpacing: -1, marginTop: 8 },
  sub: { color: Afryko.textDim, fontSize: 15.5, lineHeight: 23, marginTop: 12 },
  loginLine: { color: Afryko.textDim, textAlign: 'center', marginTop: 18, fontSize: 14 },

  statBand: { flexDirection: 'row', alignItems: 'center', backgroundColor: Afryko.surface, borderWidth: 1, borderColor: Afryko.border, borderRadius: Radius.lg, paddingVertical: 16, marginTop: 34 },
  stat: { flex: 1, alignItems: 'center' },
  statBorder: { borderRightWidth: 1, borderRightColor: Afryko.border },
  statV: { color: Afryko.text, fontFamily: Font.bold, fontSize: 20 },
  statL: { color: Afryko.textDim, fontSize: 12, marginTop: 2 },

  sectionEyebrow: { color: Afryko.violet, fontFamily: Font.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: 44 },
  sectionTitle: { color: Afryko.text, fontSize: 26, fontFamily: Font.bold, letterSpacing: -0.5, marginTop: 8 },
  features: { marginTop: 20, gap: 12 },
  feature: { backgroundColor: Afryko.surface, borderWidth: 1, borderColor: Afryko.border, borderRadius: Radius.lg, padding: 18 },
  featureIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  featureTitle: { color: Afryko.text, fontFamily: Font.bold, fontSize: 17 },
  featureDesc: { color: Afryko.textDim, fontSize: 14, lineHeight: 20, marginTop: 5 },

  ctaCard: { borderRadius: Radius.xl, padding: 24, marginTop: 40, alignItems: 'center' },
  ctaTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 22, textAlign: 'center', letterSpacing: -0.3 },
  ctaSub: { color: '#ffffffdd', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  ctaBtn: { backgroundColor: '#fff', borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 28, marginTop: 20, alignSelf: 'stretch', alignItems: 'center' },
  ctaBtnText: { color: Afryko.violet, fontFamily: Font.bold, fontSize: 16 },
  ctaGhost: { paddingVertical: 12, marginTop: 4 },
  ctaGhostText: { color: '#ffffffee', fontFamily: Font.semibold, fontSize: 14 },

  footer: { color: Afryko.textFaint, fontSize: 12, textAlign: 'center', marginTop: 30 },
});
