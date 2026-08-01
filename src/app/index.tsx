import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/ui-kit';
import { Afryko } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { avatar } from '@/lib/mock';

export default function Onboarding() {
  const router = useRouter();
  const { enterGuest } = useAuth();

  const explore = () => {
    enterGuest();
    router.replace('/accueil');
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#EEF1FF', '#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <Text style={styles.brand}>
          Afryko<Text style={{ color: Afryko.violet }}>.</Text>
        </Text>

        {/* Collage d'avatars créateurs */}
        <View style={styles.collage}>
          <Tile n={0} size={96} top={10} left={20} r={-6} />
          <Tile n={1} size={120} top={0} left={130} r={4} />
          <Tile n={2} size={104} top={110} left={0} r={5} />
          <Tile n={6} size={128} top={120} left={120} r={-4} ring />
          <Tile n={8} size={92} top={240} left={40} r={6} />
          <Tile n={11} size={100} top={230} left={160} r={-5} ring />
        </View>

        <View style={styles.bottom}>
          <Text style={styles.title}>Crée. Vends. Gagne.</Text>
          <Text style={styles.sub}>
            Le réseau social qui rémunère les créateurs africains. Publie tes vidéos, lance tes lives et vends
            directement à ton audience.
          </Text>
          <PillButton label="Commencer" icon="arrow-forward" onPress={() => router.push('/login')} style={{ marginTop: 24 }} />
          <PillButton label="Explorer sans compte" variant="ghost" onPress={explore} style={{ marginTop: 12 }} />
          <Text style={styles.login} onPress={() => router.push('/login')}>
            J'ai déjà un compte <Text style={{ color: Afryko.violet, fontWeight: '700' }}>Se connecter</Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Tile({
  n,
  size,
  top,
  left,
  r,
  ring,
}: {
  n: number;
  size: number;
  top: number;
  left: number;
  r: number;
  ring?: boolean;
}) {
  return (
    <View style={[styles.tile, { width: size, height: size * 1.15, top, left, transform: [{ rotate: `${r}deg` }] }]}>
      {ring && <LinearGradient colors={[Afryko.violet, Afryko.live]} style={StyleSheet.absoluteFill} />}
      <Image
        source={{ uri: avatar(n) }}
        style={[styles.tileImg, ring && { margin: 3, borderRadius: 26 }]}
        contentFit="cover"
        transition={300}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  safe: { flex: 1, paddingHorizontal: 24 },
  brand: { color: Afryko.text, fontSize: 26, fontWeight: '800', marginTop: 8, letterSpacing: -0.5 },
  collage: { height: 360, marginTop: 12, alignSelf: 'center', width: 300 },
  tile: { position: 'absolute', borderRadius: 28, overflow: 'hidden', backgroundColor: Afryko.surfaceAlt },
  tileImg: { flex: 1, borderRadius: 28 },
  bottom: { marginTop: 'auto', paddingBottom: 12 },
  title: { color: Afryko.text, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  sub: { color: Afryko.textDim, fontSize: 15, lineHeight: 22, marginTop: 12 },
  login: { color: Afryko.textDim, textAlign: 'center', marginTop: 18, fontSize: 14 },
});
