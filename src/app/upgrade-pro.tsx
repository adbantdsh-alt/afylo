import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { upgradeToPro } from '@/lib/db';

const BENEFITS = [
  { icon: 'bag-handle', title: 'Ta boutique', desc: 'Ajoute des produits, gère ton stock, vends direct.' },
  { icon: 'stats-chart', title: 'Studio & statistiques', desc: 'Vues, ventes, revenus, viralité — ta compta.' },
  { icon: 'repeat', title: 'Affiliation', desc: 'Revends les produits des autres et gagne une commission.' },
  { icon: 'radio', title: 'Vente en live', desc: 'Vends en direct avec le bouton Acheter.' },
  { icon: 'shield-checkmark', title: 'Paiement sécurisé', desc: 'Encaisse via XaalisPay (Wave/Orange Money), séquestre inclus.' },
] as const;

export default function UpgradePro() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (!session) {
      router.push('/login?mode=signup');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await upgradeToPro();
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Échec du passage en pro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#EAF0FF', '#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.close}>
            <Ionicons name="close" size={26} color={Afryko.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          <View style={styles.badge}>
            <Ionicons name="briefcase" size={26} color="#fff" />
          </View>
          <Text style={styles.title}>Passe en compte professionnel</Text>
          <Text style={styles.sub}>Ton compte reste le même pour regarder, aimer, commenter et acheter. Le mode Pro ajoute la vente.</Text>

          <View style={{ marginTop: 24, gap: 14 }}>
            {BENEFITS.map((b) => (
              <View key={b.title} style={styles.benefit}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={b.icon} size={22} color={Afryko.violet} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Pressable onPress={go} disabled={loading} style={styles.cta}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Devenir professionnel · Gratuit</Text>}
          </Pressable>
          <Text style={styles.note}>Gratuit. Afryko prélève seulement 5% sur tes ventes.</Text>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 6 },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 64, height: 64, borderRadius: 20, backgroundColor: Afryko.violet, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.title, fontSize: 26, color: Afryko.text, marginTop: 18, letterSpacing: -0.5 },
  sub: { ...Type.body, color: Afryko.textDim, marginTop: 8, lineHeight: 22 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Afryko.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Afryko.border, padding: 14 },
  benefitIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#3E5BFF14', alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text },
  benefitDesc: { ...Type.small, color: Afryko.textDim, marginTop: 2, lineHeight: 18 },
  error: { color: Afryko.live, ...Type.small, fontFamily: Font.semibold, marginTop: 16 },
  cta: { height: 54, borderRadius: Radius.pill, backgroundColor: Afryko.violet, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: Font.semibold, fontSize: 17 },
  note: { ...Type.caption, color: Afryko.textFaint, textAlign: 'center', marginTop: 10 },
});
