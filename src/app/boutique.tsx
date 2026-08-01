import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui-kit';
import { Afryko, Radius } from '@/constants/brand';
import { shopProducts } from '@/lib/mock';

export default function Boutique() {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Boutique</Text>
            <Text style={styles.sub}>Vends et gagne des commissions</Text>
          </View>
          <View style={styles.cart}>
            <Ionicons name="cart-outline" size={22} color={Afryko.text} />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Bandeau gains (rémunération créateur) */}
        <View style={styles.earn}>
          <View>
            <Text style={styles.earnLabel}>Tes gains ce mois</Text>
            <Text style={styles.earnValue}>124 500 FCFA</Text>
          </View>
          <View style={styles.earnBadge}>
            <Ionicons name="trending-up" size={16} color={Afryko.green} />
            <Text style={styles.earnBadgeText}>+18%</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Produits à revendre</Text>
          <Text style={styles.link}>Tout voir</Text>
        </View>

        <View style={styles.grid}>
          {shopProducts.map((p) => (
            <View key={p.id} style={styles.pcard}>
              <View style={styles.pimgWrap}>
                <Image source={{ uri: p.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
                <View style={styles.commission}>
                  <Text style={styles.commissionText}>{p.commission} commission</Text>
                </View>
              </View>
              <Text style={styles.pname} numberOfLines={1}>{p.title}</Text>
              <Text style={styles.pseller} numberOfLines={1}>{p.seller}</Text>
              <View style={styles.prow}>
                <Text style={styles.pprice}>{p.price} F</Text>
                <View style={styles.resell}>
                  <Ionicons name="repeat" size={13} color="#fff" />
                  <Text style={styles.resellText}>Revendre</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  title: { color: Afryko.text, fontSize: 24, fontWeight: '800' },
  sub: { color: Afryko.textDim, fontSize: 13, marginTop: 2 },
  cart: { width: 44, height: 44, borderRadius: 22, backgroundColor: Afryko.surfaceAlt, alignItems: 'center', justifyContent: 'center' },

  earn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 6,
    padding: 18,
    borderRadius: Radius.lg,
    backgroundColor: Afryko.surface,
    borderWidth: 1,
    borderColor: '#FFB02033',
  },
  earnLabel: { color: Afryko.textDim, fontSize: 13 },
  earnValue: { color: Afryko.gold, fontSize: 26, fontWeight: '800', marginTop: 4 },
  earnBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00C56622', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill },
  earnBadgeText: { color: Afryko.green, fontWeight: '800', fontSize: 13 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginTop: 22, marginBottom: 12 },
  section: { color: Afryko.text, fontSize: 17, fontWeight: '700' },
  link: { color: Afryko.violet, fontSize: 13, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12 },
  pcard: { width: '46%', flexGrow: 1, backgroundColor: Afryko.surface, borderRadius: Radius.lg, padding: 8 },
  pimgWrap: { aspectRatio: 1, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Afryko.surfaceAlt, marginBottom: 8 },
  commission: { position: 'absolute', top: 8, left: 8, backgroundColor: Afryko.gold, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  commissionText: { color: Afryko.ink, fontSize: 10, fontWeight: '800' },
  pname: { color: Afryko.text, fontSize: 14, fontWeight: '700', paddingHorizontal: 4 },
  pseller: { color: Afryko.textDim, fontSize: 12, paddingHorizontal: 4, marginTop: 1 },
  prow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 },
  pprice: { color: Afryko.text, fontSize: 15, fontWeight: '800' },
  resell: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Afryko.violet, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill },
  resellText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
