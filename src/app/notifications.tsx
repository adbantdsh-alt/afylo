import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { CONVERSATIONS, NOTIFS, type NotifKind } from '@/lib/notifs';

const ICON: Record<NotifKind, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  mention: { name: 'at', color: Afryko.violet },
  comment: { name: 'chatbubble', color: Afryko.violet2 },
  like: { name: 'heart', color: Afryko.live },
  rating: { name: 'star', color: Afryko.gold },
  follow: { name: 'person-add', color: Afryko.violet },
  sale: { name: 'bag-check', color: Afryko.green },
};

// Onglets de filtrage (Messages est un cas à part)
const TABS: { key: string; label: string; kinds?: NotifKind[] }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'mentions', label: 'Mentions', kinds: ['mention'] },
  { key: 'comments', label: 'Commentaires', kinds: ['comment'] },
  { key: 'likes', label: "J'aime", kinds: ['like', 'rating'] },
  { key: 'follows', label: 'Abonnés', kinds: ['follow'] },
  { key: 'sales', label: 'Ventes', kinds: ['sale'] },
  { key: 'messages', label: 'Messages' },
];

export default function Notifications() {
  const router = useRouter();
  const [tab, setTab] = useState('all');

  const active = TABS.find((t) => t.key === tab)!;
  const list = active.kinds ? NOTIFS.filter((n) => active.kinds!.includes(n.kind)) : NOTIFS;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={Afryko.text} />
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
          <Pressable onPress={() => router.push('/messages')} style={styles.back}>
            <Ionicons name="mail-outline" size={22} color={Afryko.text} />
          </Pressable>
        </View>

        {/* Filtres par catégorie */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((t) => {
            const on = tab === t.key;
            const count = t.key === 'messages' ? CONVERSATIONS.reduce((s, c) => s + c.unread, 0) : t.kinds ? NOTIFS.filter((n) => t.kinds!.includes(n.kind) && n.unread).length : NOTIFS.filter((n) => n.unread).length;
            return (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
                {count > 0 && <View style={[styles.chipDot, on && { backgroundColor: '#fff' }]} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingVertical: 6, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {tab === 'messages' ? (
          CONVERSATIONS.map((c) => (
            <Pressable key={c.id} style={[styles.row, c.unread > 0 && styles.rowUnread]} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id, name: c.name, avatar: c.avatar } })}>
              <View>
                <Avatar uri={c.avatar} size={48} />
                {c.online && <View style={styles.online} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mName}>{c.name}</Text>
                <Text style={styles.mLast} numberOfLines={1}>{c.last}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.time}>{c.time}</Text>
                {c.unread > 0 && <View style={styles.unreadPill}><Text style={styles.unreadPillText}>{c.unread}</Text></View>}
              </View>
            </Pressable>
          ))
        ) : list.length === 0 ? (
          <View style={styles.empty}><Ionicons name="notifications-off-outline" size={40} color={Afryko.textFaint} /><Text style={styles.emptyText}>Rien dans cette catégorie.</Text></View>
        ) : (
          list.map((n) => (
            <View key={n.id} style={[styles.row, n.unread && styles.rowUnread]}>
              <View>
                <Avatar uri={n.avatar} size={48} />
                <View style={[styles.badge, { backgroundColor: ICON[n.kind].color }]}>
                  <Ionicons name={ICON[n.kind].name} size={12} color="#fff" />
                </View>
              </View>
              <Text style={styles.text}>{n.text}</Text>
              <Text style={styles.time}>{n.time}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.subtitle, color: Afryko.text },

  tabs: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Afryko.surface, borderWidth: 1, borderColor: Afryko.border },
  chipOn: { backgroundColor: Afryko.violet, borderColor: Afryko.violet },
  chipText: { color: Afryko.textDim, fontFamily: Font.semibold, fontSize: 13 },
  chipTextOn: { color: '#fff' },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Afryko.live },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rowUnread: { backgroundColor: '#3E5BFF0A' },
  badge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Afryko.bg },
  text: { ...Type.small, color: Afryko.text, flex: 1, lineHeight: 19 },
  time: { ...Type.caption, color: Afryko.textFaint },

  online: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: Afryko.green, borderWidth: 2, borderColor: Afryko.bg },
  mName: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text },
  mLast: { ...Type.small, color: Afryko.textDim, marginTop: 2 },
  unreadPill: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: Afryko.violet, alignItems: 'center', justifyContent: 'center' },
  unreadPillText: { color: '#fff', fontFamily: Font.bold, fontSize: 11 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { ...Type.body, color: Afryko.textDim },
});
