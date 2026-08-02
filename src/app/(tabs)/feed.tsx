import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { VerifiedBadge, verifiedKind } from '@/components/verified';
import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { listLiveNow, type LiveRow } from '@/lib/db';
import { hashId } from '@/lib/feed-map';
import { face } from '@/lib/mock';
import { useHideOnScroll } from '@/lib/tabbar';

const fmtViewers = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')} k` : String(n));

export default function Feed() {
  const router = useRouter();
  const scroll = useHideOnScroll();
  const gate = useAuthGate();
  const [lives, setLives] = useState<LiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<'tout' | 'live'>('tout');

  const load = useCallback((soft?: boolean) => {
    if (!soft) setLoading(true);
    listLiveNow().then(setLives).catch(() => {}).finally(() => { setLoading(false); setRefreshing(false); });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const join = (l: LiveRow) =>
    router.push({ pathname: '/live', params: { role: 'viewer', liveId: l.id, name: l.host?.display_name ?? l.host?.handle ?? 'Créateur', avatar: l.host?.avatar_url ?? '' } });
  const goLive = () => { if (gate('passer en live')) router.push('/creer'); };

  const Empty = (
    <View style={styles.empty}>
      <Ionicons name="radio-outline" size={44} color={Afryko.textFaint} />
      <Text style={styles.emptyTitle}>Aucun live pour l'instant</Text>
      <Text style={styles.dim}>Sois le premier à passer en direct — vends tes produits ou échange avec ta communauté.</Text>
      <Pressable onPress={goLive} style={styles.emptyBtn}><Ionicons name="radio" size={18} color="#fff" /><Text style={styles.emptyBtnText}>Démarrer un live</Text></Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.liveDotBig} />
            <Text style={styles.brand}>En direct</Text>
          </View>
          <Pressable onPress={goLive} style={styles.goLiveBtn}>
            <Ionicons name="radio" size={16} color="#fff" />
            <Text style={styles.goLiveText}>Passer en live</Text>
          </Pressable>
        </View>
        {/* Onglets : Tout (grille) · Live (feed vidéo immersif) */}
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
      </SafeAreaView>

      {mode === 'tout' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={Afryko.violet} />}
          {...scroll}>
          {loading ? <Text style={styles.dim}>Recherche des lives…</Text> : lives.length === 0 ? Empty : lives.map((l) => <LiveCard key={l.id} l={l} onPress={() => join(l)} />)}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.masonry}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={Afryko.violet} />}
          {...scroll}>
          {loading ? (
            <Text style={styles.dim}>Recherche des lives…</Text>
          ) : lives.length === 0 ? (
            Empty
          ) : (
            <View style={styles.masonryRow}>
              <View style={styles.masonryCol}>{lives.filter((_, i) => i % 2 === 0).map((l) => <LiveTile key={l.id} l={l} onPress={() => join(l)} />)}</View>
              <View style={styles.masonryCol}>{lives.filter((_, i) => i % 2 === 1).map((l) => <LiveTile key={l.id} l={l} onPress={() => join(l)} />)}</View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/** Vignette (mode grille "Tout"). */
function LiveCard({ l, onPress }: { l: LiveRow; onPress: () => void }) {
  const thumb = l.thumbnail_url || l.host?.avatar_url || face(l.host?.handle ?? l.id);
  const sell = l.kind === 'sell';
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <View style={styles.cardScrim} />
      <View style={styles.cardTop}>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveBadgeText}>LIVE</Text></View>
        <View style={styles.viewers}><Ionicons name="eye" size={12} color="#fff" /><Text style={styles.viewersText}>{fmtViewers(l.viewer_count)}</Text></View>
      </View>
      <View style={[styles.kindTag, sell ? styles.kindSell : styles.kindSimple]}>
        <Ionicons name={sell ? 'bag-handle' : 'chatbubbles'} size={11} color="#fff" />
        <Text style={styles.kindText}>{sell ? 'Vente' : 'Live'}</Text>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.hostRow}>
          <Avatar uri={l.host?.avatar_url || face(l.host?.handle ?? l.id)} size={26} />
          <Text style={styles.hostName} numberOfLines={1}>{l.host?.display_name || l.host?.handle || 'Créateur'}</Text>
          <VerifiedBadge kind={verifiedKind(l.host)} size={13} />
        </View>
        {!!l.title && <Text style={styles.cardTitle} numberOfLines={2}>{l.title}</Text>}
      </View>
    </Pressable>
  );
}

/** Vignette du mur "Live" (façon Explore, 2 colonnes, hauteurs variées). */
function LiveTile({ l, onPress }: { l: LiveRow; onPress: () => void }) {
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
      {sell && <View style={styles.tileSell}><Ionicons name="bag-handle" size={11} color="#fff" /><Text style={styles.kindText}>Vente</Text></View>}
      <View style={styles.tileBottom}>
        <Avatar uri={l.host?.avatar_url || face(l.host?.handle ?? l.id)} size={22} />
        <Text style={styles.tileHost} numberOfLines={1}>{l.host?.display_name || l.host?.handle || 'Créateur'}</Text>
        <VerifiedBadge kind={verifiedKind(l.host)} size={12} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  brand: { ...Type.title, fontSize: 24, color: Afryko.text },
  liveDotBig: { width: 10, height: 10, borderRadius: 5, backgroundColor: Afryko.live },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Afryko.live, borderRadius: Radius.pill, paddingHorizontal: 14, height: 38 },
  goLiveText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },

  segs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Afryko.border },
  seg: { marginRight: 24, paddingVertical: 10, alignItems: 'center' },
  segText: { ...Type.body, fontFamily: Font.semibold, color: Afryko.textDim },
  segTextOn: { color: Afryko.text },
  segLine: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, borderRadius: 2, backgroundColor: Afryko.text },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 120 },
  dim: { color: Afryko.textDim, fontSize: 14, textAlign: 'center', width: '100%', marginTop: 30 },
  dimLight: { color: '#ffffffcc', fontSize: 14, textAlign: 'center' },
  centerDark: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { width: '100%', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 50, gap: 8 },
  emptyTitle: { color: Afryko.text, fontSize: 17, fontFamily: Font.bold, marginTop: 8 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afryko.live, borderRadius: Radius.pill, paddingHorizontal: 20, paddingVertical: 13, marginTop: 16 },
  emptyBtnText: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },

  card: { width: '48%', aspectRatio: 0.72, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Afryko.surfaceAlt, justifyContent: 'space-between', flexGrow: 1 },
  cardScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000022' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Afryko.live, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: { color: '#fff', fontSize: 10, fontFamily: Font.bold, letterSpacing: 0.5 },
  viewers: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#00000066', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  viewersText: { color: '#fff', fontSize: 11, fontFamily: Font.semibold },
  kindTag: { position: 'absolute', top: 40, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  kindSell: { backgroundColor: Afryko.green },
  kindSimple: { backgroundColor: '#00000088' },
  kindText: { color: '#fff', fontSize: 10, fontFamily: Font.bold },
  cardBottom: { padding: 10, gap: 6 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hostName: { color: '#fff', fontSize: 13, fontFamily: Font.bold, flexShrink: 1 },
  cardTitle: { color: '#fff', fontSize: 13, lineHeight: 17, opacity: 0.95 },

  // Mur "Live" (façon Explore, 2 colonnes, hauteurs variées)
  masonry: { paddingHorizontal: 6, paddingTop: 6, paddingBottom: 120 },
  masonryRow: { flexDirection: 'row', gap: 6 },
  masonryCol: { flex: 1, gap: 6 },
  tile: { borderRadius: 14, overflow: 'hidden', backgroundColor: Afryko.surfaceAlt, justifyContent: 'space-between' },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8 },
  tileSell: { position: 'absolute', top: 38, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Afryko.green, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tileBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  tileHost: { color: '#fff', fontSize: 12, fontFamily: Font.bold, flexShrink: 1 },
});
