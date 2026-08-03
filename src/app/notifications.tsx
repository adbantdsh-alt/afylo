import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { VerifiedBadge, verifiedKind } from '@/components/verified';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { listConversations, listNotifications, markNotifsRead, type Conversation, type Notif } from '@/lib/db';
import { timeAgo } from '@/lib/feed-map';
import { face } from '@/lib/mock';

const ICON: Record<Notif['kind'], { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  follow: { name: 'person-add', color: Afylo.violet },
  live: { name: 'radio', color: Afylo.live },
  sale: { name: 'bag-check', color: Afylo.green },
  commission: { name: 'cash', color: Afylo.gold },
  like: { name: 'star', color: Afylo.gold },
  comment: { name: 'chatbubble', color: Afylo.violet2 },
  mention: { name: 'at', color: Afylo.violet },
  repost: { name: 'repeat', color: Afylo.green },
};

function notifText(n: Notif): string {
  const who = n.actor?.display_name || n.actor?.handle || 'Quelqu’un';
  switch (n.kind) {
    case 'follow': return `${who} s'est abonné(e) à toi.`;
    case 'live': return `${who} est en direct — rejoins le live !`;
    case 'sale': return `Nouvelle vente ! ${who} a acheté un de tes produits.`;
    case 'commission': return `Commission gagnée grâce à un achat de ${who} 🎉`;
    case 'like': return `${who} a aimé ta publication.`;
    case 'comment': return `${who} a commenté ta publication.`;
    case 'mention': return `${who} t'a mentionné(e).`;
    case 'repost': return `${who} a repartagé ta publication.`;
  }
}

const TABS: { key: string; label: string; kinds?: Notif['kind'][] }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'follows', label: 'Abonnés', kinds: ['follow'] },
  { key: 'sales', label: 'Ventes', kinds: ['sale', 'commission'] },
  { key: 'live', label: 'Lives', kinds: ['live'] },
  { key: 'likes', label: "J'aime", kinds: ['like'] },
  { key: 'messages', label: 'Messages' },
];

export default function Notifications() {
  const router = useRouter();
  const [tab, setTab] = useState('all');
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      Promise.all([listNotifications(), listConversations()])
        .then(([n, c]) => { setNotifs(n); setConvos(c); })
        .catch(() => {})
        .finally(() => setLoading(false));
      markNotifsRead().catch(() => {}); // ouvrir la page = tout lu
    }, []),
  );

  const active = TABS.find((t) => t.key === tab)!;
  const list = active.kinds ? notifs.filter((n) => active.kinds!.includes(n.kind)) : notifs;

  const openNotif = (n: Notif) => {
    if (n.kind === 'live' && n.target_id) {
      router.push({ pathname: '/live', params: { role: 'viewer', liveId: n.target_id, name: n.actor?.display_name ?? '', avatar: n.actor?.avatar_url ?? '' } });
    } else if (n.kind === 'sale' || n.kind === 'commission') {
      router.push('/studio');
    } else if (n.actor?.handle) {
      router.push({ pathname: '/creator/[id]', params: { id: n.actor.handle, name: n.actor.display_name ?? '', avatar: n.actor.avatar_url ?? '' } });
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={Afylo.text} />
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
          <Pressable onPress={() => router.push('/messages')} style={styles.back}>
            <Ionicons name="mail-outline" size={22} color={Afylo.text} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((t) => {
            const on = tab === t.key;
            const count = t.key === 'messages' ? convos.reduce((s, c) => s + c.unread, 0) : 0;
            return (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
                {count > 0 && <View style={styles.chipDot} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingVertical: 6, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={Afylo.violet} style={{ marginTop: 34 }} />
        ) : tab === 'messages' ? (
          convos.length === 0 ? (
            <View style={styles.empty}><Ionicons name="chatbubbles-outline" size={40} color={Afylo.textFaint} /><Text style={styles.emptyText}>Aucun message.</Text></View>
          ) : (
            convos.map((c) => (
              <Pressable key={c.otherId} style={[styles.row, c.unread > 0 && styles.rowUnread]} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.otherId, name: c.other?.display_name ?? '', avatar: c.other?.avatar_url ?? '' } })}>
                <Avatar uri={c.other?.avatar_url || face(c.other?.handle ?? c.otherId)} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mName} numberOfLines={1}>{c.other?.display_name || c.other?.handle || 'Créateur'}</Text>
                  <Text style={styles.mLast} numberOfLines={1}>{c.last.kind === 'text' ? c.last.text : '📎 Pièce jointe'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.time}>{timeAgo(c.last.created_at)}</Text>
                  {c.unread > 0 && <View style={styles.unreadPill}><Text style={styles.unreadPillText}>{c.unread}</Text></View>}
                </View>
              </Pressable>
            ))
          )
        ) : list.length === 0 ? (
          <View style={styles.empty}><Ionicons name="notifications-off-outline" size={40} color={Afylo.textFaint} /><Text style={styles.emptyText}>{tab === 'all' ? 'Aucune notification pour l’instant.' : 'Rien dans cette catégorie.'}</Text></View>
        ) : (
          list.map((n) => (
            <Pressable key={n.id} style={[styles.row, !n.read_at && styles.rowUnread]} onPress={() => openNotif(n)}>
              <View>
                <Avatar uri={n.actor?.avatar_url || face(n.actor?.handle ?? n.id)} size={48} />
                <View style={[styles.badge, { backgroundColor: ICON[n.kind].color }]}>
                  <Ionicons name={ICON[n.kind].name} size={12} color="#fff" />
                </View>
              </View>
              <View style={styles.textWrap}>
                <View style={styles.nameLine}>
                  <Text style={styles.text} numberOfLines={2}>{notifText(n)}</Text>
                  {verifiedKind(n.actor) && <VerifiedBadge kind={verifiedKind(n.actor)} size={13} />}
                </View>
                <Text style={styles.time}>{timeAgo(n.created_at)}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.subtitle, color: Afylo.text },

  tabs: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border },
  chipOn: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  chipText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 13 },
  chipTextOn: { color: '#fff' },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Afylo.live },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rowUnread: { backgroundColor: Afylo.violet + '0F' },
  badge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Afylo.bg },
  textWrap: { flex: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  text: { ...Type.small, color: Afylo.text, flexShrink: 1, lineHeight: 19 },
  time: { ...Type.caption, color: Afylo.textFaint, marginTop: 2 },

  mName: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  mLast: { ...Type.small, color: Afylo.textDim, marginTop: 2 },
  unreadPill: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center' },
  unreadPillText: { color: '#fff', fontFamily: Font.bold, fontSize: 11 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { ...Type.body, color: Afylo.textDim },
});
