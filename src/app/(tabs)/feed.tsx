import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Radius } from '@/constants/brand';
import { exploreItems, type ExploreItem } from '@/lib/mock';
import { useHideOnScroll } from '@/lib/tabbar';

const FILTERS = ['Créateurs', 'Vidéos courtes', 'Produits', 'Lives'];

export default function Explore() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const scroll = useHideOnScroll();
  const col = (mod: number) => exploreItems.filter((_, i) => i % 2 === mod);
  const open = (it: ExploreItem) => router.push(`/watch/${exploreItems.indexOf(it)}`);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <Pressable style={styles.searchWrap} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={18} color={Afylo.textDim} />
          <Text style={styles.searchPlaceholder}>Chercher un créateur, une vidéo, un produit</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f, i) => (
            <Pressable key={f} onPress={() => setActive(i)} style={[styles.chip, active === i && styles.chipActive]}>
              <Text style={[styles.chipText, active === i && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid} {...scroll}>
        <View style={styles.column}>{col(0).map((it) => <GridCard key={it.id} item={it} onPress={() => open(it)} />)}</View>
        <View style={styles.column}>{col(1).map((it) => <GridCard key={it.id} item={it} onPress={() => open(it)} />)}</View>
      </ScrollView>
    </View>
  );
}

function GridCard({ item, onPress }: { item: ExploreItem; onPress: () => void }) {
  return (
    <Pressable style={[styles.gcard, { aspectRatio: item.tall ? 0.72 : 1 }]} onPress={onPress}>
      <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
      {item.live && (
        <View style={styles.liveTag}>
          <View style={styles.dot} />
          <Text style={styles.liveTagText}>LIVE</Text>
        </View>
      )}
      <View style={styles.gcardFooter}>
        <Text style={styles.gcardName}>{item.name}</Text>
        <Text style={styles.gcardLabel}>{item.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Afylo.surface,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: Radius.pill,
  },
  searchPlaceholder: { color: Afylo.textFaint, fontSize: 14 },
  filters: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Afylo.surface },
  chipActive: { backgroundColor: Afylo.violet },
  chipText: { color: Afylo.textDim, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },

  grid: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, paddingBottom: 110 },
  column: { flex: 1, gap: 10 },
  gcard: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt, justifyContent: 'flex-end' },
  gcardFooter: { padding: 10, backgroundColor: '#00000055' },
  gcardName: { color: '#fff', fontWeight: '800', fontSize: 15 },
  gcardLabel: { color: '#ffffffcc', fontSize: 12, marginTop: 1 },
  liveTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Afylo.live,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
