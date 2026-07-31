import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { affiliationProducts, CITIES, NICHES, type AffiliationProduct } from '@/lib/mock';

export default function Affiliation() {
  const router = useRouter();
  const [niche, setNiche] = useState('Tout');
  const [city, setCity] = useState('Toutes');
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const list = useMemo(() => {
    return affiliationProducts
      .filter((p) => (niche === 'Tout' ? true : p.niche === niche))
      .filter((p) => (city === 'Toutes' ? true : p.city === city))
      .filter((p) => (query ? p.title.toLowerCase().includes(query.toLowerCase()) : true))
      .sort((a, b) => b.commission - a.commission);
  }, [niche, city, query]);

  const copyLink = async (p: AffiliationProduct) => {
    const link = `https://afylo.app/p/${p.id}?ref=me`;
    try {
      await Clipboard.setStringAsync(link);
    } catch {}
    setCopiedId(p.id);
    setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 1500);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={Afylo.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Affiliation</Text>
            <Text style={styles.subtitle}>Copie un lien, partage-le en live, gagne une commission</Text>
          </View>
        </View>

        {/* Recherche */}
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={Afylo.textDim} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Chercher un produit"
            placeholderTextColor={Afylo.textFaint}
          />
        </View>

        {/* Filtres niche */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {NICHES.map((n) => (
            <Chip key={n} label={n} active={niche === n} onPress={() => setNiche(n)} />
          ))}
        </ScrollView>
        {/* Filtres ville */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsCity}>
          <Ionicons name="location-outline" size={16} color={Afylo.textDim} style={{ marginRight: 4, alignSelf: 'center' }} />
          {CITIES.map((c) => (
            <Chip key={c} label={c} active={city === c} onPress={() => setCity(c)} subtle />
          ))}
        </ScrollView>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.count}>{list.length} produit{list.length > 1 ? 's' : ''} à revendre</Text>
        {list.map((p) => (
          <ProductRow key={p.id} p={p} copied={copiedId === p.id} onCopy={() => copyLink(p)} />
        ))}
        {list.length === 0 && <Text style={styles.empty}>Aucun produit pour ces filtres.</Text>}
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress, subtle }: { label: string; active: boolean; onPress: () => void; subtle?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && (subtle ? styles.chipActiveSubtle : styles.chipActive)]}>
      <Text style={[styles.chipText, active && { color: subtle ? Afylo.text : '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

function ProductRow({ p, copied, onCopy }: { p: AffiliationProduct; copied: boolean; onCopy: () => void }) {
  const earn = Math.round(((p.promo ?? p.price) * p.commission) / 100);
  return (
    <View style={styles.card}>
      <Image source={{ uri: p.image }} style={styles.cardImg} contentFit="cover" transition={200} />
      <View style={styles.commissionBadge}>
        <Text style={styles.commissionText}>{p.commission}%</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{p.title}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{p.seller} · {p.city}</Text>

        <View style={styles.priceRow}>
          {p.promo ? (
            <>
              <Text style={styles.promo}>{p.promo.toLocaleString('fr-FR')} F</Text>
              <Text style={styles.priceStrike}>{p.price.toLocaleString('fr-FR')} F</Text>
            </>
          ) : (
            <Text style={styles.price}>{p.price.toLocaleString('fr-FR')} F</Text>
          )}
        </View>

        <Text style={styles.earn}>Tu gagnes ≈ {earn.toLocaleString('fr-FR')} F / vente</Text>

        <View style={styles.actions}>
          <Pressable onPress={onCopy} style={[styles.copyBtn, copied && styles.copyBtnDone]}>
            <Ionicons name={copied ? 'checkmark' : 'link'} size={16} color={copied ? '#fff' : Afylo.violet} />
            <Text style={[styles.copyText, copied && { color: '#fff' }]}>{copied ? 'Lien copié' : 'Copier le lien'}</Text>
          </Pressable>
          <Pressable style={styles.resellBtn}>
            <Ionicons name="repeat" size={16} color="#fff" />
            <Text style={styles.resellText}>Revendre</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.title, color: Afylo.text },
  subtitle: { ...Type.caption, color: Afylo.textDim, marginTop: 2 },

  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afylo.surface, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 16, height: 48, borderRadius: Radius.pill, borderWidth: 1, borderColor: Afylo.border },
  searchInput: { flex: 1, ...Type.body, color: Afylo.text, height: '100%' },

  chips: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  chipsCity: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border },
  chipActive: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  chipActiveSubtle: { backgroundColor: Afylo.surfaceAlt, borderColor: Afylo.text },
  chipText: { ...Type.small, color: Afylo.textDim },

  count: { ...Type.small, color: Afylo.textDim, marginBottom: 12 },
  empty: { ...Type.body, color: Afylo.textDim, textAlign: 'center', marginTop: 30 },

  card: { flexDirection: 'row', backgroundColor: Afylo.surface, borderRadius: Radius.lg, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: Afylo.border },
  cardImg: { width: 96, height: 96, borderRadius: Radius.md, backgroundColor: Afylo.surfaceAlt },
  commissionBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: Afylo.green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  commissionText: { color: '#fff', fontFamily: Font.bold, fontSize: 12 },
  cardBody: { flex: 1, marginLeft: 12 },
  cardTitle: { ...Type.subtitle, fontSize: 16, color: Afylo.text },
  cardMeta: { ...Type.caption, color: Afylo.textDim, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  price: { fontFamily: Font.bold, fontSize: 16, color: Afylo.text },
  promo: { fontFamily: Font.bold, fontSize: 16, color: Afylo.live },
  priceStrike: { ...Type.small, color: Afylo.textFaint, textDecorationLine: 'line-through' },
  earn: { ...Type.small, color: Afylo.green, marginTop: 4 },

  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  copyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Afylo.violet },
  copyBtnDone: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  copyText: { fontFamily: Font.semibold, fontSize: 13, color: Afylo.violet },
  resellBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, paddingHorizontal: 16, borderRadius: Radius.pill, backgroundColor: Afylo.violet },
  resellText: { fontFamily: Font.semibold, fontSize: 13, color: '#fff' },
});
