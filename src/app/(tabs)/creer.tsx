import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Radius } from '@/constants/brand';

const OPTIONS = [
  { icon: 'videocam', title: 'Vidéo courte', desc: 'Filme, monte et publie en quelques secondes', color: Afylo.violet },
  { icon: 'radio', title: 'Démarrer un live', desc: 'Vends en direct avec le bouton Acheter', color: Afylo.live },
  { icon: 'bag-add', title: 'Ajouter un produit', desc: 'Mets un article dans ta boutique', color: Afylo.gold },
  { icon: 'repeat', title: 'Revendre (affiliation)', desc: 'Gagne une commission sans stock', color: Afylo.green },
] as const;

export default function Creer() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Créer</Text>
          <Pressable onPress={() => router.back()} style={styles.close}>
            <Ionicons name="close" size={22} color={Afylo.text} />
          </Pressable>
        </View>
        <Text style={styles.sub}>Que veux-tu partager aujourd'hui ?</Text>

        <View style={{ gap: 14, marginTop: 20 }}>
          {OPTIONS.map((o) => (
            <Pressable key={o.title} style={({ pressed }) => [styles.opt, { opacity: pressed ? 0.85 : 1 }]}>
              <LinearGradient
                colors={[o.color, o.color + 'AA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.optIcon}>
                <Ionicons name={o.icon} size={24} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.optTitle}>{o.title}</Text>
                <Text style={styles.optDesc}>{o.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Afylo.textFaint} />
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  title: { color: Afylo.text, fontSize: 28, fontWeight: '800' },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: Afylo.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  sub: { color: Afylo.textDim, fontSize: 15, marginTop: 6 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Afylo.surface,
    borderRadius: Radius.lg,
    padding: 14,
  },
  optIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optTitle: { color: Afylo.text, fontSize: 16, fontWeight: '700' },
  optDesc: { color: Afylo.textDim, fontSize: 13, marginTop: 2 },
});
