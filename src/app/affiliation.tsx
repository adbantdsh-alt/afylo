import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { PRODUCT_CATEGORIES } from '@/lib/categories';
import { addAffiliation, listAffiliatableProducts, listMyAffiliatedProductIds, removeAffiliation, startLive, type FeedProduct } from '@/lib/db';
import { useMe } from '@/lib/me';
import { photo } from '@/lib/mock';

/** Produit affiliable affiché (issu d'un vrai produit d'un autre vendeur). */
type AffItem = { id: string; title: string; price: number; promo: number | null; commission: number; image: string; seller: string; tiers: { qty: number; price_cfa: number }[]; category: string | null; sold: number; created: string };
const toAff = (p: FeedProduct): AffItem => ({
  id: p.id,
  title: p.title,
  price: p.price_cfa,
  promo: p.promo_cfa,
  commission: p.commission_pct,
  image: p.image_url || photo(`p-${p.id}`, 400, 400),
  seller: p.owner?.display_name || p.owner?.handle || 'Vendeur',
  tiers: p.quantity_tiers ?? [],
  category: p.category,
  sold: p.sold_count ?? 0,
  created: p.created_at,
});

export default function Affiliation() {
  const router = useRouter();
  const me = useMe();

  // « Vendre en live » : lance un live avec le produit d'affiliation déjà sélectionné à la vente.
  const sellLive = async (p: AffItem) => {
    const live = await startLive({ title: `Live · ${me.name}`, kind: 'sell', thumbnail_url: me.avatar }).catch(() => null);
    const product = JSON.stringify({ id: `aff-${p.id}`, title: p.title, price: `${(p.promo ?? p.price).toLocaleString('fr-FR')} FCFA`, image: p.image, tag: `Affiliation ${p.commission}%` });
    router.push({ pathname: '/live', params: { role: 'host', liveId: live?.id ?? '', name: me.name, avatar: me.avatar, product } });
  };
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string>(''); // catégorie filtrée ('' = toutes)
  const [sort, setSort] = useState<'top' | 'commission' | 'price' | 'recent'>('top');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [items, setItems] = useState<AffItem[]>([]);
  const [affiliatedIds, setAffiliatedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    listAffiliatableProducts().then((rows) => setItems(rows.map(toAff))).catch(() => {});
    listMyAffiliatedProductIds().then(setAffiliatedIds).catch(() => {});
  }, []);

  // « Revendre » : ajoute (ou retire) le produit à MA boutique en affiliation — persistant.
  const toggleResell = (p: AffItem) => {
    const on = affiliatedIds.has(p.id);
    setAffiliatedIds((prev) => { const n = new Set(prev); if (on) n.delete(p.id); else n.add(p.id); return n; });
    (on ? removeAffiliation(p.id) : addAffiliation(p.id)).catch(() => {});
  };

  const SORTS = { top: (a: AffItem, b: AffItem) => b.sold - a.sold, commission: (a: AffItem, b: AffItem) => b.commission - a.commission, price: (a: AffItem, b: AffItem) => (a.promo ?? a.price) - (b.promo ?? b.price), recent: (a: AffItem, b: AffItem) => b.created.localeCompare(a.created) };
  // Top ventes (carrousel en tête) — meilleures ventes réelles (sold_count).
  const topSellers = useMemo(() => [...items].sort((a, b) => b.sold - a.sold).slice(0, 8), [items]);
  const list = useMemo(
    () =>
      items
        .filter((p) => (cat ? p.category === cat : true))
        .filter((p) => (query ? (p.title + ' ' + p.seller).toLowerCase().includes(query.toLowerCase()) : true))
        .sort(SORTS[sort]),
    [items, query, cat, sort],
  );

  const copyLink = async (p: AffItem) => {
    const link = `https://afylo.app/p/${p.id}?ref=me`;
    try {
      await Clipboard.setStringAsync(link);
    } catch {}
    setCopiedId(p.id);
    setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 1500);
  };

  // Marketplace d'affiliation : réservé aux comptes PRO (vendeurs/affiliés).
  if (!me.isPro) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
          <View style={styles.header}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.back}><Ionicons name="chevron-back" size={26} color={Afylo.text} /></Pressable>
            <View style={{ flex: 1 }}><Text style={styles.title}>Affiliation</Text></View>
          </View>
        </SafeAreaView>
        <View style={styles.gate}>
          <View style={styles.gateIcon}><Ionicons name="repeat" size={40} color={Afylo.violet} /></View>
          <Text style={styles.gateTitle}>Réservé aux comptes Pro</Text>
          <Text style={styles.gateSub}>Passe en compte professionnel pour revendre les produits d'autres créateurs et gagner des commissions.</Text>
          <Pressable style={styles.gateBtn} onPress={() => router.push('/upgrade-pro')}><Text style={styles.gateBtnText}>Passer en Pro</Text></Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={Afylo.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Marketplace affiliation</Text>
            <Text style={styles.subtitle}>Revends les meilleurs produits, gagne une commission</Text>
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
          {query.length > 0 && <Ionicons name="close-circle" size={18} color={Afylo.textFaint} onPress={() => setQuery('')} />}
        </View>

        {/* Catégories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          <Pressable onPress={() => setCat('')} style={[styles.catChip, cat === '' && styles.catChipOn]}>
            <Ionicons name="apps-outline" size={15} color={cat === '' ? '#fff' : Afylo.textDim} />
            <Text style={[styles.catText, cat === '' && { color: '#fff' }]}>Tout</Text>
          </Pressable>
          {PRODUCT_CATEGORIES.map((c) => (
            <Pressable key={c.key} onPress={() => setCat(c.key)} style={[styles.catChip, cat === c.key && styles.catChipOn]}>
              <Ionicons name={c.icon as any} size={15} color={cat === c.key ? '#fff' : Afylo.textDim} />
              <Text style={[styles.catText, cat === c.key && { color: '#fff' }]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Tri */}
        <View style={styles.sortRow}>
          {([['top', 'Top ventes'], ['commission', 'Commission'], ['price', 'Prix'], ['recent', 'Récent']] as const).map(([k, label]) => (
            <Pressable key={k} onPress={() => setSort(k)} style={[styles.sortChip, sort === k && styles.sortChipOn]}>
              <Text style={[styles.sortText, sort === k && styles.sortTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Top ventes — carrousel (masqué quand un filtre/recherche est actif) */}
        {!query && !cat && topSellers.length > 0 && (
          <>
            <Text style={styles.sectionH}>🔥 Top ventes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
              {topSellers.map((p) => (
                <Pressable key={p.id} onPress={() => sellLive(p)} style={styles.topCard}>
                  <Image source={{ uri: p.image }} style={styles.topImg} contentFit="cover" transition={200} />
                  <View style={styles.topCommission}><Text style={styles.topCommissionText}>{p.commission}%</Text></View>
                  <View style={{ padding: 10 }}>
                    <Text style={styles.topTitle} numberOfLines={1}>{p.title}</Text>
                    <Text style={styles.topPrice}>{(p.promo ?? p.price).toLocaleString('fr-FR')} F</Text>
                    <Text style={styles.topSold} numberOfLines={1}>{p.sold > 0 ? `${p.sold} vendu${p.sold > 1 ? 's' : ''}` : 'Nouveau'}</Text>
                    <View style={styles.topLiveBtn}><Ionicons name="radio" size={13} color="#fff" /><Text style={styles.topLiveText}>Vendre en live</Text></View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.sectionH}>Tous les produits</Text>
          </>
        )}
        <Text style={styles.count}>{list.length} produit{list.length > 1 ? 's' : ''} à revendre</Text>
        <View style={styles.grid}>
          {list.map((p) => (
            <GridCard
              key={p.id}
              p={p}
              copied={copiedId === p.id}
              resold={affiliatedIds.has(p.id)}
              onOpen={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
              onCopy={() => copyLink(p)}
              onSellLive={() => sellLive(p)}
              onResell={() => toggleResell(p)}
            />
          ))}
        </View>
        {list.length === 0 && <Text style={styles.empty}>Aucun produit à revendre pour l'instant.</Text>}
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

/** Carte compacte (grille 2 colonnes). Tap sur l'image/titre → fiche produit. */
function GridCard({ p, copied, resold, onOpen, onCopy, onSellLive, onResell }: { p: AffItem; copied: boolean; resold: boolean; onOpen: () => void; onCopy: () => void; onSellLive: () => void; onResell: () => void }) {
  const earn = Math.round(((p.promo ?? p.price) * p.commission) / 100);
  return (
    <View style={styles.gcard}>
      {/* Zone cliquable → fiche produit (image + infos). Séparée des boutons pour éviter les doubles taps. */}
      <Pressable onPress={onOpen}>
        <View style={styles.gImgWrap}>
          <Image source={{ uri: p.image }} style={styles.gImg} contentFit="cover" transition={200} />
          <View style={styles.commissionBadge}><Text style={styles.commissionText}>{p.commission}%</Text></View>
        </View>
        <View style={styles.gBody}>
          <Text style={styles.gTitle} numberOfLines={1}>{p.title}</Text>
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
          <Text style={styles.earn} numberOfLines={1}>Tu gagnes ≈ {earn.toLocaleString('fr-FR')} F</Text>
        </View>
      </Pressable>

      {/* Action principale + secondaires (icônes) */}
      <View style={styles.gActions}>
        <Pressable onPress={onResell} style={[styles.resellBtn, resold && { backgroundColor: Afylo.green }]}>
          <Ionicons name={resold ? 'checkmark' : 'repeat'} size={15} color="#fff" />
          <Text style={styles.resellText}>{resold ? 'Ajouté' : 'Revendre'}</Text>
        </Pressable>
        <Pressable onPress={onCopy} style={[styles.iconBtn, copied && styles.iconBtnDone]} hitSlop={6}>
          <Ionicons name={copied ? 'checkmark' : 'link'} size={16} color={copied ? '#fff' : Afylo.violet} />
        </Pressable>
        <Pressable onPress={onSellLive} style={styles.iconBtnLive} hitSlop={6}>
          <Ionicons name="radio" size={16} color="#fff" />
        </Pressable>
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

  sectionH: { color: Afylo.text, fontFamily: Font.bold, fontSize: 17, marginBottom: 10, marginTop: 2 },
  topCard: { width: 160, backgroundColor: Afylo.surface, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Afylo.border },
  topImg: { width: 160, height: 110, backgroundColor: Afylo.surfaceAlt },
  topCommission: { position: 'absolute', top: 8, left: 8, backgroundColor: Afylo.green, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  topCommissionText: { color: '#fff', fontFamily: Font.bold, fontSize: 11 },
  topTitle: { color: Afylo.text, fontFamily: Font.semibold, fontSize: 14 },
  topPrice: { color: Afylo.text, fontFamily: Font.bold, fontSize: 15, marginTop: 2 },
  topSold: { color: Afylo.textDim, fontSize: 11, marginTop: 1 },
  topLiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8, height: 34, borderRadius: Radius.pill, backgroundColor: Afylo.live },
  topLiveText: { color: '#fff', fontFamily: Font.bold, fontSize: 12 },

  catRow: { gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: Radius.pill, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border },
  catChipOn: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  catText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 13 },
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, backgroundColor: Afylo.surfaceAlt },
  sortChipOn: { backgroundColor: Afylo.ink },
  sortText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 12 },
  sortTextOn: { color: Afylo.bg },

  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 10 },
  gateIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: Afylo.violet + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  gateTitle: { color: Afylo.text, fontFamily: Font.bold, fontSize: 20 },
  gateSub: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  gateBtn: { backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingHorizontal: 28, paddingVertical: 13, marginTop: 10 },
  gateBtnText: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },
  empty: { ...Type.body, color: Afylo.textDim, textAlign: 'center', marginTop: 30 },

  commissionBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: Afylo.green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  commissionText: { color: '#fff', fontFamily: Font.bold, fontSize: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  price: { fontFamily: Font.bold, fontSize: 15, color: Afylo.text },
  promo: { fontFamily: Font.bold, fontSize: 15, color: Afylo.live },
  priceStrike: { ...Type.caption, color: Afylo.textFaint, textDecorationLine: 'line-through' },
  earn: { ...Type.caption, color: Afylo.green, fontFamily: Font.semibold, marginTop: 3 },

  // Grille 2 colonnes
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gcard: { width: '47%', flexGrow: 1, backgroundColor: Afylo.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Afylo.border, overflow: 'hidden' },
  gImgWrap: { width: '100%', aspectRatio: 1, backgroundColor: Afylo.surfaceAlt },
  gImg: { width: '100%', height: '100%' },
  gBody: { paddingHorizontal: 10, paddingTop: 8 },
  gTitle: { ...Type.small, fontFamily: Font.semibold, color: Afylo.text },
  gActions: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, paddingTop: 8 },
  resellBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 36, borderRadius: Radius.pill, backgroundColor: Afylo.violet },
  resellText: { fontFamily: Font.semibold, fontSize: 12.5, color: '#fff' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: Afylo.violet, alignItems: 'center', justifyContent: 'center' },
  iconBtnDone: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  iconBtnLive: { width: 36, height: 36, borderRadius: 18, backgroundColor: Afylo.live, alignItems: 'center', justifyContent: 'center' },
});
