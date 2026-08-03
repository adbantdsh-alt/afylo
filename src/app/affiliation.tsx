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
        {list.map((p) => (
          <ProductRow key={p.id} p={p} copied={copiedId === p.id} resold={affiliatedIds.has(p.id)} onCopy={() => copyLink(p)} onSellLive={() => sellLive(p)} onResell={() => toggleResell(p)} />
        ))}
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

function ProductRow({ p, copied, resold, onCopy, onSellLive, onResell }: { p: AffItem; copied: boolean; resold: boolean; onCopy: () => void; onSellLive: () => void; onResell: () => void }) {
  const earn = Math.round(((p.promo ?? p.price) * p.commission) / 100);
  return (
    <View style={styles.card}>
      <Image source={{ uri: p.image }} style={styles.cardImg} contentFit="cover" transition={200} />
      <View style={styles.commissionBadge}>
        <Text style={styles.commissionText}>{p.commission}%</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{p.title}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{p.seller}</Text>

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
        {p.tiers.length > 0 && (
          <Text style={styles.tiers} numberOfLines={1}>Prix par lot : {p.tiers.map((t) => `${t.qty}→${t.price_cfa.toLocaleString('fr-FR')}`).join(' · ')}</Text>
        )}

        <View style={styles.actions}>
          <Pressable onPress={onCopy} style={[styles.copyBtn, copied && styles.copyBtnDone]}>
            <Ionicons name={copied ? 'checkmark' : 'link'} size={16} color={copied ? '#fff' : Afylo.violet} />
            <Text style={[styles.copyText, copied && { color: '#fff' }]}>{copied ? 'Lien copié' : 'Copier le lien'}</Text>
          </Pressable>
          <Pressable onPress={onResell} style={[styles.resellBtn, resold && { backgroundColor: Afylo.green }]}>
            <Ionicons name={resold ? 'checkmark' : 'repeat'} size={16} color="#fff" />
            <Text style={styles.resellText}>{resold ? 'Dans ta boutique' : 'Revendre'}</Text>
          </Pressable>
        </View>

        {/* Vendre en live : passe en direct avec ce produit d'affiliation déjà sélectionné */}
        <Pressable onPress={onSellLive} style={styles.sellLiveBtn}>
          <Ionicons name="radio" size={16} color="#fff" />
          <Text style={styles.sellLiveText}>Vendre en live</Text>
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

  card: { flexDirection: 'row', backgroundColor: Afylo.surface, borderRadius: Radius.lg, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: Afylo.border },
  cardImg: { width: 96, height: 96, borderRadius: Radius.md, backgroundColor: Afylo.surfaceAlt },
  sellLiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, height: 44, borderRadius: Radius.pill, backgroundColor: Afylo.live },
  sellLiveText: { color: '#fff', fontFamily: Font.bold, fontSize: 14 },
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
  tiers: { ...Type.caption, color: Afylo.textDim, marginTop: 3 },

  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  copyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Afylo.violet },
  copyBtnDone: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  copyText: { fontFamily: Font.semibold, fontSize: 13, color: Afylo.violet },
  resellBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, paddingHorizontal: 16, borderRadius: Radius.pill, backgroundColor: Afylo.violet },
  resellText: { fontFamily: Font.semibold, fontSize: 13, color: '#fff' },
});
