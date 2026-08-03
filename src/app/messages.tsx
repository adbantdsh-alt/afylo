import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { VerifiedBadge, verifiedKind } from '@/components/verified';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { listConversations, type Conversation } from '@/lib/db';
import { timeAgo } from '@/lib/feed-map';
import { useMe } from '@/lib/me';
import { face } from '@/lib/mock';

export default function Messages() {
  const router = useRouter();
  const { isPro } = useMe();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('Tout');

  useFocusEffect(
    useCallback(() => {
      listConversations().then((c) => setConvos(c)).catch(() => {}).finally(() => setLoading(false));
    }, []),
  );

  // Onglets : Store visible uniquement pour les comptes Pro (vendeurs)
  const tabs = ['Tout', 'Général', ...(isPro ? ['Store'] : []), 'Invitations'];
  const byTab = (c: Conversation) => {
    switch (tab) {
      case 'Général': return c.category === 'general' || (c.category === 'store' && !isPro);
      case 'Store': return c.category === 'store';
      case 'Invitations': return c.category === 'invitation';
      default: return true; // Tout
    }
  };
  const countFor = (t: string) => convos.filter((c) => c.unread > 0 && (t === 'Invitations' ? c.category === 'invitation' : t === 'Store' ? c.category === 'store' : true)).length;

  const filtered = convos.filter(byTab).filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (c.other?.display_name ?? '').toLowerCase().includes(s) || (c.other?.handle ?? '').toLowerCase().includes(s);
  });

  const open = (c: Conversation) =>
    router.push({ pathname: '/chat/[id]', params: { id: c.otherId, name: c.other?.display_name ?? c.other?.handle ?? 'Discussion', avatar: c.other?.avatar_url ?? '' } });

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={26} color={Afylo.text} onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} />
            <Text style={styles.title}>Messages</Text>
          </View>
          <Ionicons name="create-outline" size={24} color={Afylo.text} onPress={() => router.push('/search')} />
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={Afylo.textDim} />
          <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Rechercher" placeholderTextColor={Afylo.textFaint} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((t) => {
            const n = t !== 'Tout' && t !== 'Général' ? countFor(t) : 0;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
                <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t}</Text>
                {n > 0 && <View style={styles.tabDot}><Text style={styles.tabDotText}>{n}</Text></View>}
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
        {loading ? (
          <ActivityIndicator color={Afylo.violet} style={{ marginTop: 34 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color={Afylo.textFaint} />
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptySub}>Écris à un créateur depuis son profil pour démarrer une conversation.</Text>
          </View>
        ) : (
          filtered.map((c) => (
            <Pressable key={c.otherId} onPress={() => open(c)} style={styles.row}>
              <Avatar uri={c.other?.avatar_url || face(c.other?.handle ?? c.otherId)} size={56} ring={c.unread > 0} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.rowTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, marginRight: 8 }}>
                    <Text style={styles.name} numberOfLines={1}>{c.other?.display_name || c.other?.handle || 'Créateur'}</Text>
                    <VerifiedBadge kind={verifiedKind(c.other)} size={14} />
                  </View>
                  <Text style={styles.time}>{timeAgo(c.last.created_at)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={[styles.last, c.unread > 0 && styles.lastUnread]} numberOfLines={1}>
                    {c.last.kind === 'image' ? '📷 Photo' : c.last.kind === 'product' ? '🛍️ Produit' : c.last.text}
                  </Text>
                  {c.unread > 0 && (
                    <View style={styles.badge}><Text style={styles.badgeText}>{c.unread}</Text></View>
                  )}
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 6 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...Type.title, color: Afylo.text },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afylo.surface, marginHorizontal: 16, marginTop: 6, marginBottom: 6, paddingHorizontal: 16, height: 44, borderRadius: Radius.pill, borderWidth: 1, borderColor: Afylo.border },
  searchInput: { flex: 1, ...Type.body, fontSize: 15, color: Afylo.text, height: '100%' },
  tabs: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Afylo.surfaceAlt },
  tabOn: { backgroundColor: Afylo.violet },
  tabText: { ...Type.small, fontFamily: Font.semibold, color: Afylo.textDim },
  tabTextOn: { color: '#fff' },
  tabDot: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Afylo.live, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabDotText: { color: '#fff', fontSize: 11, fontFamily: Font.bold },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text, flex: 1, marginRight: 8 },
  time: { ...Type.caption, color: Afylo.textFaint },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  last: { ...Type.small, color: Afylo.textDim, flex: 1, marginRight: 10 },
  lastUnread: { color: Afylo.text, fontFamily: Font.semibold },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontFamily: Font.bold, fontSize: 12 },

  empty: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 50 },
  emptyTitle: { color: Afylo.text, fontSize: 16, fontFamily: Font.bold, marginTop: 12 },
  emptySub: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
