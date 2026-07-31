import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { avatar } from '@/lib/mock';

const convos = [
  { id: 'c1', name: 'Awa Cosmetics', avatar: avatar(9), last: 'Le coffret est dispo ?', time: '2 min', unread: 2, online: true },
  { id: 'c2', name: 'Modou Beats', avatar: avatar(15), last: 'Merci pour la commande 🙏', time: '1 h', unread: 0, online: true },
  { id: 'c3', name: 'Sokhna Créations', avatar: avatar(20), last: 'Livraison demain à Dakar', time: '3 h', unread: 0, online: false },
  { id: 'c4', name: 'Cheikh Tech', avatar: avatar(33), last: 'Tu as vu mon live hier ?', time: '1 j', unread: 1, online: false },
  { id: 'c5', name: 'Mariama Cuisine', avatar: avatar(45), last: 'Je te réserve le lot 👌', time: '2 j', unread: 0, online: false },
];

export default function Messages() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={26} color={Afylo.text} onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} />
            <Text style={styles.title}>Messages</Text>
          </View>
          <Ionicons name="create-outline" size={24} color={Afylo.text} />
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={Afylo.textDim} />
          <TextInput style={styles.searchInput} placeholder="Rechercher" placeholderTextColor={Afylo.textFaint} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
        {convos.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id, name: c.name, avatar: c.avatar } })}
            style={styles.row}>
            <View>
              <Avatar uri={c.avatar} size={56} ring={c.unread > 0} />
              {c.online && <View style={styles.online} />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.rowTop}>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.time}>{c.time}</Text>
              </View>
              <View style={styles.rowBottom}>
                <Text style={[styles.last, c.unread > 0 && styles.lastUnread]} numberOfLines={1}>{c.last}</Text>
                {c.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{c.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        ))}
        <Text style={styles.note}>La messagerie complète arrive bientôt.</Text>
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

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  online: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: Afylo.green, borderWidth: 2, borderColor: Afylo.bg },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  time: { ...Type.caption, color: Afylo.textFaint },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  last: { ...Type.small, color: Afylo.textDim, flex: 1, marginRight: 10 },
  lastUnread: { color: Afylo.text, fontFamily: Font.semibold },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontFamily: Font.bold, fontSize: 12 },
  note: { ...Type.caption, color: Afylo.textFaint, textAlign: 'center', marginTop: 20 },
});
