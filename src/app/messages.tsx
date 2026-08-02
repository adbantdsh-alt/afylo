import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { listConversations, type Conversation } from '@/lib/db';
import { timeAgo } from '@/lib/feed-map';
import { face } from '@/lib/mock';

export default function Messages() {
  const router = useRouter();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useFocusEffect(
    useCallback(() => {
      listConversations().then((c) => setConvos(c)).catch(() => {}).finally(() => setLoading(false));
    }, []),
  );

  const filtered = convos.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (c.other?.display_name ?? '').toLowerCase().includes(s) || (c.other?.handle ?? '').toLowerCase().includes(s);
  });

  const open = (c: Conversation) =>
    router.push({ pathname: '/chat/[id]', params: { id: c.otherId, name: c.other?.display_name ?? c.other?.handle ?? 'Discussion', avatar: c.other?.avatar_url ?? '' } });

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={26} color={Afryko.text} onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} />
            <Text style={styles.title}>Messages</Text>
          </View>
          <Ionicons name="create-outline" size={24} color={Afryko.text} onPress={() => router.push('/search')} />
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={Afryko.textDim} />
          <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Rechercher" placeholderTextColor={Afryko.textFaint} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
        {loading ? (
          <ActivityIndicator color={Afryko.violet} style={{ marginTop: 34 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color={Afryko.textFaint} />
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptySub}>Écris à un créateur depuis son profil pour démarrer une conversation.</Text>
          </View>
        ) : (
          filtered.map((c) => (
            <Pressable key={c.otherId} onPress={() => open(c)} style={styles.row}>
              <Avatar uri={c.other?.avatar_url || face(c.other?.handle ?? c.otherId)} size={56} ring={c.unread > 0} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>{c.other?.display_name || c.other?.handle || 'Créateur'}</Text>
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
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 6 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...Type.title, color: Afryko.text },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afryko.surface, marginHorizontal: 16, marginTop: 6, marginBottom: 6, paddingHorizontal: 16, height: 44, borderRadius: Radius.pill, borderWidth: 1, borderColor: Afryko.border },
  searchInput: { flex: 1, ...Type.body, fontSize: 15, color: Afryko.text, height: '100%' },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text, flex: 1, marginRight: 8 },
  time: { ...Type.caption, color: Afryko.textFaint },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  last: { ...Type.small, color: Afryko.textDim, flex: 1, marginRight: 10 },
  lastUnread: { color: Afryko.text, fontFamily: Font.semibold },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Afryko.violet, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontFamily: Font.bold, fontSize: 12 },

  empty: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 50 },
  emptyTitle: { color: Afryko.text, fontSize: 16, fontFamily: Font.bold, marginTop: 12 },
  emptySub: { color: Afryko.textDim, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
