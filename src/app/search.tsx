import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { exploreItems } from '@/lib/mock';
import { searchSounds } from '@/lib/sounds';

const TABS = ['Créateurs', 'Vidéos', 'Sons', 'Tags'];
const TAGS = ['#dakar', '#waxstyle', '#afrobeats', '#tutoriel', '#liveshopping', '#senegal', '#beaute', '#mode'];

export default function Search() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState(0);

  const creators = useMemo(
    () => exploreItems.filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true)),
    [q],
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.headerRow}>
          <Ionicons name="chevron-back" size={26} color={Afylo.text} onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} />
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Afylo.textDim} />
            <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Rechercher" placeholderTextColor={Afylo.textFaint} autoFocus />
            {q.length > 0 && <Ionicons name="close-circle" size={18} color={Afylo.textFaint} onPress={() => setQ('')} />}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((t, i) => (
            <Pressable key={t} onPress={() => setTab(i)} style={[styles.tab, tab === i && styles.tabOn]}>
              <Text style={[styles.tabText, tab === i && { color: '#fff' }]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {tab === 3 ? (
          <View style={styles.tagWrap}>
            {TAGS.filter((t) => (q ? t.includes(q.toLowerCase()) : true)).map((t) => (
              <Pressable key={t} style={styles.tagPill}>
                <Text style={styles.tagText}>{t}</Text>
              </Pressable>
            ))}
          </View>
        ) : tab === 2 ? (
          <View>
            {searchSounds(q).map((s) => (
              <Pressable key={s.id} style={styles.soundRow} onPress={() => router.push({ pathname: '/sound/[id]', params: { id: s.id } })}>
                <View style={styles.soundIcon}><Ionicons name="musical-notes" size={20} color={Afylo.violet} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.soundName} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.soundMeta}>{s.artist} · {s.uses} publications</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Afylo.textFaint} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {creators.map((c) => (
              <View key={c.id} style={styles.creator}>
                <Avatar uri={c.image} size={60} ring={c.live} />
                <Text style={styles.creatorName} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.creatorLabel} numberOfLines={1}>{c.label}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afylo.surfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 14, height: 42 },
  searchInput: { flex: 1, ...Type.body, fontSize: 15, color: Afylo.text, height: '100%' },
  tabs: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Afylo.surfaceAlt },
  tabOn: { backgroundColor: Afylo.violet },
  tabText: { ...Type.small, fontFamily: Font.semibold, color: Afylo.text },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  creator: { width: 80, alignItems: 'center' },
  creatorName: { ...Type.caption, fontFamily: Font.semibold, color: Afylo.text, marginTop: 6 },
  creatorLabel: { ...Type.caption, color: Afylo.textDim },

  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  soundIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: Afylo.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  soundName: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  soundMeta: { ...Type.caption, color: Afylo.textDim, marginTop: 2 },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill, backgroundColor: Afylo.surfaceAlt },
  tagText: { ...Type.body, fontFamily: Font.semibold, color: Afylo.violet },
});
