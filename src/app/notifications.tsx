import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afryko, Font, Type } from '@/constants/brand';
import { avatar } from '@/lib/mock';

type Notif = { id: string; kind: 'like' | 'follow' | 'sale' | 'comment' | 'rating'; avatar: string; text: string; time: string; unread?: boolean };

const NOTIFS: Notif[] = [
  { id: 'n1', kind: 'sale', avatar: avatar(9), text: 'Awa a acheté ton « Ensemble wax premium » — 18 500 F en séquestre.', time: '5 min', unread: true },
  { id: 'n2', kind: 'follow', avatar: avatar(15), text: 'Modou Beats a commencé à te suivre.', time: '22 min', unread: true },
  { id: 'n3', kind: 'rating', avatar: avatar(20), text: 'Sokhna a noté ta vidéo 9/10 🔥', time: '1 h' },
  { id: 'n4', kind: 'comment', avatar: avatar(45), text: 'Mariama a commenté : « Trop belle cette tenue 😍 »', time: '3 h' },
  { id: 'n5', kind: 'like', avatar: avatar(33), text: 'Cheikh et 42 autres ont aimé ta publication.', time: '5 h' },
];

const ICON: Record<Notif['kind'], { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  like: { name: 'heart', color: Afryko.live },
  follow: { name: 'person-add', color: Afryko.violet },
  sale: { name: 'bag-check', color: Afryko.green },
  comment: { name: 'chatbubble', color: Afryko.violet },
  rating: { name: 'star', color: Afryko.gold },
};

export default function Notifications() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <Ionicons name="chevron-back" size={26} color={Afryko.text} onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} />
          <Text style={styles.title}>Notifications</Text>
          <View style={{ width: 26 }} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
        {NOTIFS.map((n) => (
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
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  title: { ...Type.subtitle, color: Afryko.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rowUnread: { backgroundColor: '#3E5BFF0A' },
  badge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Afryko.bg },
  text: { ...Type.small, color: Afryko.text, flex: 1, lineHeight: 19 },
  time: { ...Type.caption, color: Afryko.textFaint },
});
