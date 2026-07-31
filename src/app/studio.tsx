import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Radius } from '@/constants/brand';
import { studioDays, studioKpis, studioTopPosts } from '@/lib/mock';

export default function Studio() {
  const router = useRouter();
  const maxViews = Math.max(...studioDays.map((d) => d.views));

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={Afylo.text} />
          </Pressable>
          <View>
            <Text style={styles.title}>Studio</Text>
            <Text style={styles.subtitle}>Tes stats · 7 derniers jours</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Ionicons name="calendar-outline" size={22} color={Afylo.textDim} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* KPI cards */}
        <View style={styles.kpiGrid}>
          <Kpi icon="eye" label="Vues" value={studioKpis.views7d} trend={studioKpis.viewsTrend} color={Afylo.violet} />
          <Kpi icon="bag-check" label="Ventes" value={studioKpis.sales7d} trend={studioKpis.salesTrend} color={Afylo.green} />
          <Kpi icon="cash" label="Revenus (F)" value={studioKpis.revenue7d} trend={studioKpis.revenueTrend} color={Afylo.gold} />
          <Kpi icon="people" label="Abonnés" value={studioKpis.followers7d} trend="7j" color={Afylo.live} />
        </View>

        {/* Graphe vues */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vues par jour</Text>
          <View style={styles.chart}>
            {studioDays.map((d) => (
              <View key={d.d} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={[Afylo.violet2, Afylo.violet]}
                    style={[styles.bar, { height: `${(d.views / maxViews) * 100}%` }]}
                  />
                </View>
                <Text style={styles.barLabel}>{d.d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Compta / revenus */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Comptabilité</Text>
            <Text style={styles.link}>Exporter</Text>
          </View>
          <Line label="Ventes produits" value="382 000 F" />
          <Line label="Pourboires lives" value="35 000 F" />
          <Line label="Commissions affiliation" value="18 500 F" />
          <View style={styles.divider} />
          <Line label="Commission Afylo (5%)" value="−21 775 F" dim />
          <View style={styles.divider} />
          <Line label="Net à percevoir" value="431 725 F" strong />
          <Pressable style={styles.payoutBtn}>
            <Ionicons name="wallet" size={18} color={Afylo.ink} />
            <Text style={styles.payoutText}>Retirer via Wave</Text>
          </Pressable>
        </View>

        {/* Viralité */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top viralité</Text>
          {studioTopPosts.map((p, i) => (
            <View key={p.id} style={styles.viralRow}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Image source={{ uri: p.image }} style={styles.viralThumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.viralViews}>{p.views} vues · {p.sales} ventes</Text>
                <View style={styles.viralTrack}>
                  <View style={[styles.viralFill, { width: `${p.viral}%` }]} />
                </View>
              </View>
              <Text style={styles.viralScore}>{p.viral}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Kpi({ icon, label, value, trend, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; trend: string; color: string }) {
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiTrend, { color: Afylo.green }]}>{trend}</Text>
    </View>
  );
}

function Line({ label, value, strong, dim }: { label: string; value: string; strong?: boolean; dim?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, dim && { color: Afylo.textFaint }]}>{label}</Text>
      <Text style={[styles.lineValue, strong && { color: Afylo.gold, fontSize: 17 }, dim && { color: Afylo.textFaint }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Afylo.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: Afylo.textDim, fontSize: 12 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: { width: '46%', flexGrow: 1, backgroundColor: Afylo.surface, borderRadius: Radius.lg, padding: 14 },
  kpiIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiValue: { color: Afylo.text, fontSize: 22, fontWeight: '800' },
  kpiLabel: { color: Afylo.textDim, fontSize: 13, marginTop: 2 },
  kpiTrend: { fontSize: 12, fontWeight: '800', marginTop: 4 },

  card: { backgroundColor: Afylo.surface, borderRadius: Radius.lg, padding: 16, marginTop: 14 },
  cardTitle: { color: Afylo.text, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { color: Afylo.violet, fontSize: 13, fontWeight: '600' },

  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 8, minHeight: 6 },
  barLabel: { color: Afylo.textDim, fontSize: 11, marginTop: 6 },

  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  lineLabel: { color: Afylo.textDim, fontSize: 14 },
  lineValue: { color: Afylo.text, fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Afylo.surfaceAlt, marginVertical: 6 },
  payoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Afylo.gold, borderRadius: Radius.pill, paddingVertical: 13, marginTop: 14 },
  payoutText: { color: Afylo.ink, fontWeight: '800', fontSize: 15 },

  viralRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rank: { color: Afylo.textFaint, fontSize: 16, fontWeight: '800', width: 16 },
  viralThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: Afylo.surfaceAlt },
  viralViews: { color: Afylo.text, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  viralTrack: { height: 6, borderRadius: 3, backgroundColor: Afylo.surfaceAlt, overflow: 'hidden' },
  viralFill: { height: '100%', borderRadius: 3, backgroundColor: Afylo.violet },
  viralScore: { color: Afylo.violet, fontSize: 15, fontWeight: '800' },
});
