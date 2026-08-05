import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuzzBadge } from '@/components/buzz-badge';
import { PaymentSheet } from '@/components/payment-sheet';
import { Avatar } from '@/components/ui-kit';
import { VerifiedBadge, verifiedKind } from '@/components/verified';
import { useBuzz } from '@/lib/buzz';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { followUser, listCreators, listFeedProducts, listLiveNow, myFollowingIds, startLive, unfollowUser, type FeedProduct, type LiveRow } from '@/lib/db';
import { hashId } from '@/lib/feed-map';
import { useMe } from '@/lib/me';
import { face } from '@/lib/mock';
import { useHideOnScroll } from '@/lib/tabbar';
import { formatCfa, type Profile } from '@/types/db';

const fmtViewers = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')} k` : String(n));
const fmt = (n: number) => n.toLocaleString('fr-FR');

export default function Feed() {
  const router = useRouter();
  const scroll = useHideOnScroll();
  const gate = useAuthGate();
  const me = useMe();
  const [confirmLive, setConfirmLive] = useState(false); // confirmation avant de passer en direct
  const [lives, setLives] = useState<LiveRow[]>([]);
  const [products, setProducts] = useState<FeedProduct[]>([]);
  const [creators, setCreators] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<'tout' | 'live'>('tout');
  const [payItems, setPayItems] = useState<{ title: string; price: string }[] | null>(null);
  const buzz = useBuzz();

  const load = useCallback((soft?: boolean) => {
    if (!soft) setLoading(true);
    Promise.all([listLiveNow(), listFeedProducts(), listCreators(20), myFollowingIds()])
      .then(([lv, pr, cr, fids]) => { setLives(lv); setProducts(pr); setCreators(cr); setFollowing(new Set(fids)); })
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation();
  // Re-tap sur l'onglet Live (déjà actif) → remonte en haut + actualise.
  useEffect(() => {
    const unsub = (navigation as any).addListener?.('tabPress', () => {
      if ((navigation as any).isFocused?.()) { scrollRef.current?.scrollTo({ y: 0, animated: true }); setRefreshing(true); load(true); }
    });
    return unsub;
  }, [navigation, load]);

  const join = (l: LiveRow) =>
    router.push({ pathname: '/live', params: { role: 'viewer', liveId: l.id, name: l.host?.display_name ?? l.host?.handle ?? 'Créateur', avatar: l.host?.avatar_url ?? '' } });
  // « Passer en live » → confirmation simple (évite les lives involontaires), puis lancement direct du live.
  const goLive = () => { if (gate('passer en live')) setConfirmLive(true); };
  const doGoLive = async () => {
    setConfirmLive(false);
    const live = await startLive({ title: `Live · ${me.name}`, kind: me.isPro ? 'sell' : 'simple', thumbnail_url: me.avatar }).catch(() => null);
    router.push({ pathname: '/live', params: { role: 'host', liveId: live?.id ?? '', name: me.name, avatar: me.avatar } });
  };
  const buy = (p: FeedProduct) => { if (gate('acheter')) setPayItems([{ title: p.title, price: formatCfa(p.promo_cfa ?? p.price_cfa) }]); };
  const openCreator = (c: { handle?: string | null; id: string; display_name?: string | null; avatar_url?: string | null }) =>
    (c.handle || c.id) && router.push({ pathname: '/creator/[id]', params: { id: c.handle ?? c.id, name: c.display_name ?? '', avatar: c.avatar_url ?? '' } });

  const topProducts = products.slice(0, 12);
  const liveHosts = lives.map((l) => l.host?.id).filter(Boolean);
  const suggestions = creators.filter((c) => !liveHosts.includes(c.id)).slice(0, 15);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <View style={styles.segs}>
            <Pressable style={styles.seg} onPress={() => setMode('tout')}>
              <Text style={[styles.segText, mode === 'tout' && styles.segTextOn]}>Tout</Text>
              {mode === 'tout' && <View style={styles.segLine} />}
            </Pressable>
            <Pressable style={styles.seg} onPress={() => setMode('live')}>
              <Text style={[styles.segText, mode === 'live' && styles.segTextOn]}>Live</Text>
              {mode === 'live' && <View style={styles.segLine} />}
            </Pressable>
          </View>
          <Pressable onPress={goLive} style={styles.goLiveBtn}>
            <Ionicons name="radio" size={15} color="#fff" />
            <Text style={styles.goLiveText}>Passer en live</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {mode === 'tout' ? (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={Afylo.violet} />}
          {...scroll}>
          {/* Hero */}
          <LinearGradient colors={[Afylo.violet, Afylo.live]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroTitle}>🌍 L'Afrique en live</Text>
            <Text style={styles.heroSub}>Découvre les lives, achète en direct et gagne en repartageant.</Text>
          </LinearGradient>

          {/* En direct maintenant */}
          {lives.length > 0 && (
            <Section title="🔴 En direct maintenant" onSeeAll={() => setMode('live')}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {lives.map((l) => (
                  <Pressable key={l.id} style={styles.liveH} onPress={() => join(l)}>
                    <Image source={{ uri: l.thumbnail_url || l.host?.avatar_url || face(l.host?.handle ?? l.id) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                    <View style={styles.cardScrim} />
                    <View style={styles.liveHTop}>
                      <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveBadgeText}>LIVE</Text></View>
                      <View style={styles.viewers}><Ionicons name="eye" size={11} color="#fff" /><Text style={styles.viewersText}>{fmtViewers(l.viewer_count)}</Text></View>
                    </View>
                    {l.kind === 'sell' && <View style={styles.sellTag}><Ionicons name="bag-handle" size={10} color="#fff" /><Text style={styles.tagText}>Vente</Text></View>}
                    {l.id === buzz.liveId && <View style={styles.buzzTag}><BuzzBadge size="sm" /></View>}
                    <View style={styles.liveHBottom}>
                      <Avatar uri={l.host?.avatar_url || face(l.host?.handle ?? l.id)} size={22} />
                      <Text style={styles.liveHName} numberOfLines={1}>{l.host?.display_name || l.host?.handle || 'Créateur'}</Text>
                      <VerifiedBadge kind={verifiedKind(l.host)} size={12} />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          )}

          {/* Les plus vendus */}
          {topProducts.length > 0 && (
            <Section title="🔥 Les plus vendus">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {topProducts.map((p) => (
                  <Pressable key={p.id} style={styles.prodH} onPress={() => buy(p)}>
                    <Image source={{ uri: p.image_url || p.images?.[0] }} style={styles.prodHImg} contentFit="cover" transition={200} />
                    <Text style={styles.prodHTitle} numberOfLines={1}>{p.title}</Text>
                    <View style={styles.prodHPriceRow}>
                      <Text style={styles.prodHPrice}>{fmt(p.promo_cfa ?? p.price_cfa)} F</Text>
                      {p.promo_cfa ? <Text style={styles.prodHOld}>{fmt(p.price_cfa)} F</Text> : null}
                    </View>
                    <Text style={styles.prodHSold}>{p.sold_count > 0 ? `${fmt(p.sold_count)} vendus` : 'Nouveau'} · {p.owner?.display_name || p.owner?.handle}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          )}

          {/* Créateurs à suivre */}
          {suggestions.length > 0 && (
            <Section title="⭐ Créateurs à suivre">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {suggestions.map((c) => (
                  <View key={c.id} style={styles.creatorCard}>
                    <Pressable onPress={() => openCreator(c)} style={{ alignItems: 'center' }}>
                      <Avatar uri={c.avatar_url || face(c.handle ?? c.id)} size={64} ring={c.is_verified} />
                      <View style={styles.creatorNameRow}>
                        <Text style={styles.creatorName} numberOfLines={1}>{c.display_name || c.handle || 'Créateur'}</Text>
                        <VerifiedBadge kind={verifiedKind(c)} size={12} />
                      </View>
                      <Text style={styles.creatorSub} numberOfLines={1}>{c.account_type === 'merchant' ? 'Boutique' : 'Créateur'}</Text>
                    </Pressable>
                    <FollowButton id={c.id} initial={following.has(c.id)} />
                  </View>
                ))}
              </ScrollView>
            </Section>
          )}

          {loading && lives.length === 0 && topProducts.length === 0 && <Text style={styles.dim}>Chargement…</Text>}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.masonry}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={Afylo.violet} />}
          {...scroll}>
          {loading ? (
            <Text style={styles.dim}>Recherche des lives…</Text>
          ) : lives.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="radio-outline" size={44} color={Afylo.textFaint} />
              <Text style={styles.emptyTitle}>Aucun live pour l'instant</Text>
              <Text style={styles.dim}>Sois le premier à passer en direct.</Text>
              <Pressable onPress={goLive} style={styles.emptyBtn}><Ionicons name="radio" size={18} color="#fff" /><Text style={styles.emptyBtnText}>Démarrer un live</Text></Pressable>
            </View>
          ) : (
            <View style={styles.masonryRow}>
              <View style={styles.masonryCol}>{lives.filter((_, i) => i % 2 === 0).map((l) => <LiveTile key={l.id} l={l} isBuzz={l.id === buzz.liveId} onPress={() => join(l)} />)}</View>
              <View style={styles.masonryCol}>{lives.filter((_, i) => i % 2 === 1).map((l) => <LiveTile key={l.id} l={l} isBuzz={l.id === buzz.liveId} onPress={() => join(l)} />)}</View>
            </View>
          )}
        </ScrollView>
      )}

      <PaymentSheet visible={!!payItems} items={payItems ?? []} onClose={() => setPayItems(null)} />

      {/* Confirmation avant de passer en direct (évite les lives involontaires) */}
      <Modal visible={confirmLive} transparent animationType="fade" onRequestClose={() => setConfirmLive(false)}>
        <Pressable style={styles.confirmOverlay} onPress={() => setConfirmLive(false)}>
          <Pressable style={styles.confirmCard} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.confirmIcon}><Ionicons name="radio" size={26} color="#fff" /></View>
            <Text style={styles.confirmTitle}>Passer en direct ?</Text>
            <Text style={styles.confirmSub}>Tu vas démarrer un live maintenant, visible par ta communauté.</Text>
            <Pressable onPress={doGoLive} style={styles.confirmGo}><Text style={styles.confirmGoText}>Oui, passer en live</Text></Pressable>
            <Pressable onPress={() => setConfirmLive(false)} style={styles.confirmCancel}><Text style={styles.confirmCancelText}>Annuler</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Section({ title, onSeeAll, children }: { title: string; onSeeAll?: () => void; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 18 }}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll && <Pressable onPress={onSeeAll}><Text style={styles.seeAll}>Tout voir</Text></Pressable>}
      </View>
      {children}
    </View>
  );
}

function FollowButton({ id, initial }: { id: string; initial: boolean }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (busy) return;
    const next = !f;
    setF(next); setBusy(true);
    try { if (next) await followUser(id); else await unfollowUser(id); } catch { setF(!next); } finally { setBusy(false); }
  };
  return (
    <Pressable style={[styles.followBtn, f && styles.followBtnOn]} onPress={toggle}>
      <Text style={[styles.followText, f && styles.followTextOn]}>{f ? 'Suivi' : 'Suivre'}</Text>
    </Pressable>
  );
}

function LiveTile({ l, isBuzz, onPress }: { l: LiveRow; isBuzz?: boolean; onPress: () => void }) {
  const thumb = l.thumbnail_url || l.host?.avatar_url || face(l.host?.handle ?? l.id);
  const sell = l.kind === 'sell';
  const tall = hashId(l.id) % 3 === 0;
  return (
    <Pressable style={[styles.tile, { aspectRatio: tall ? 0.62 : 0.85 }]} onPress={onPress}>
      <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <View style={styles.cardScrim} />
      <View style={styles.tileTop}>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveBadgeText}>LIVE</Text></View>
        <View style={styles.viewers}><Ionicons name="eye" size={11} color="#fff" /><Text style={styles.viewersText}>{fmtViewers(l.viewer_count)}</Text></View>
      </View>
      {sell && <View style={styles.tileSell}><Ionicons name="bag-handle" size={11} color="#fff" /><Text style={styles.tagText}>Vente</Text></View>}
      {isBuzz && <View style={styles.buzzTileTag}><BuzzBadge size="sm" /></View>}
      <View style={styles.tileBottom}>
        <Avatar uri={l.host?.avatar_url || face(l.host?.handle ?? l.id)} size={22} />
        <Text style={styles.tileHost} numberOfLines={1}>{l.host?.display_name || l.host?.handle || 'Créateur'}</Text>
        <VerifiedBadge kind={verifiedKind(l.host)} size={12} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: Afylo.border },
  segs: { flexDirection: 'row' },
  seg: { marginRight: 22, paddingVertical: 12, alignItems: 'center' },
  segText: { ...Type.subtitle, fontFamily: Font.bold, color: Afylo.textDim },
  segTextOn: { color: Afylo.text },
  segLine: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, borderRadius: 2, backgroundColor: Afylo.text },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Afylo.live, borderRadius: Radius.pill, paddingHorizontal: 12, height: 36 },
  goLiveText: { color: '#fff', fontFamily: Font.bold, fontSize: 12 },
  confirmOverlay: { flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: 26 },
  confirmCard: { width: '100%', maxWidth: 360, backgroundColor: Afylo.bg, borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: Afylo.border },
  confirmIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Afylo.live, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  confirmTitle: { ...Type.title, color: Afylo.text, textAlign: 'center' },
  confirmSub: { ...Type.body, color: Afylo.textDim, textAlign: 'center', marginTop: 6, marginBottom: 18, lineHeight: 21 },
  confirmGo: { width: '100%', height: 50, borderRadius: Radius.pill, backgroundColor: Afylo.live, alignItems: 'center', justifyContent: 'center' },
  confirmGoText: { color: '#fff', fontFamily: Font.bold, fontSize: 16 },
  confirmCancel: { height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  confirmCancelText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 14 },

  hero: { marginHorizontal: 16, marginTop: 12, borderRadius: Radius.xl, padding: 20 },
  heroTitle: { color: '#fff', fontSize: 22, fontFamily: Font.bold },
  heroSub: { color: '#ffffffe6', fontSize: 14, marginTop: 6, lineHeight: 20 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { ...Type.subtitle, color: Afylo.text },
  seeAll: { color: Afylo.violet, fontFamily: Font.semibold, fontSize: 13 },
  strip: { paddingHorizontal: 16, gap: 12 },
  dim: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', width: '100%', marginTop: 30 },

  // Live horizontal (vitrine)
  liveH: { width: 132, aspectRatio: 0.8, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt, justifyContent: 'space-between' },
  liveHTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 7 },
  liveHBottom: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 7 },
  liveHName: { color: '#fff', fontSize: 11, fontFamily: Font.bold, flexShrink: 1 },

  // Produit horizontal
  prodH: { width: 140 },
  prodHImg: { width: 140, height: 140, borderRadius: Radius.md, backgroundColor: Afylo.surfaceAlt },
  prodHTitle: { ...Type.small, fontFamily: Font.semibold, color: Afylo.text, marginTop: 7 },
  prodHPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  prodHPrice: { color: Afylo.gold, fontSize: 15, fontFamily: Font.bold },
  prodHOld: { color: Afylo.textFaint, fontSize: 11, textDecorationLine: 'line-through' },
  prodHSold: { color: Afylo.textDim, fontSize: 11, marginTop: 2 },

  // Créateur
  creatorCard: { width: 108, alignItems: 'center', backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.lg, padding: 12, gap: 8 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  creatorName: { color: Afylo.text, fontSize: 13, fontFamily: Font.bold, flexShrink: 1 },
  creatorSub: { color: Afylo.textDim, fontSize: 11, marginTop: 1 },
  followBtn: { alignSelf: 'stretch', backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingVertical: 8, alignItems: 'center' },
  followBtnOn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Afylo.border },
  followText: { color: '#fff', fontFamily: Font.bold, fontSize: 12 },
  followTextOn: { color: Afylo.text },

  // Badges partagés
  cardScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000026' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Afylo.live, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: { color: '#fff', fontSize: 9, fontFamily: Font.bold, letterSpacing: 0.5 },
  viewers: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#00000066', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  viewersText: { color: '#fff', fontSize: 10, fontFamily: Font.semibold },
  sellTag: { position: 'absolute', top: 34, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Afylo.green, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { color: '#fff', fontSize: 9, fontFamily: Font.bold },
  buzzTag: { position: 'absolute', top: 34, right: 7 },
  buzzTileTag: { position: 'absolute', top: 38, right: 8 },

  // Mur "Live"
  masonry: { paddingHorizontal: 6, paddingTop: 6, paddingBottom: 120 },
  masonryRow: { flexDirection: 'row', gap: 6 },
  masonryCol: { flex: 1, gap: 6 },
  tile: { borderRadius: 14, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt, justifyContent: 'space-between' },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8 },
  tileSell: { position: 'absolute', top: 38, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Afylo.green, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tileBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  tileHost: { color: '#fff', fontSize: 12, fontFamily: Font.bold, flexShrink: 1 },

  empty: { width: '100%', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 50, gap: 8 },
  emptyTitle: { color: Afylo.text, fontSize: 17, fontFamily: Font.bold, marginTop: 8 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afylo.live, borderRadius: Radius.pill, paddingHorizontal: 20, paddingVertical: 13, marginTop: 16 },
  emptyBtnText: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },
});
