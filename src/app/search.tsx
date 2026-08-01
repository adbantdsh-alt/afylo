import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { searchProfiles } from '@/lib/db';
import { face } from '@/lib/mock';
import { searchSounds } from '@/lib/sounds';
import type { Profile } from '@/types/db';

const TABS = ['Créateurs', 'Vidéos', 'Sons', 'Tags'];
const TAGS = ['#dakar', '#waxstyle', '#afrobeats', '#tutoriel', '#liveshopping', '#senegal', '#beaute', '#mode'];

export default function Search() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState(0);
  const [creators, setCreators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Recherche RÉELLE des comptes (Supabase), avec léger anti-rebond
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const t = setTimeout(() => {
      searchProfiles(q)
        .then((r) => { if (!cancel) setCreators(r); })
        .catch(() => { if (!cancel) setCreators([]); })
        .finally(() => { if (!cancel) setLoading(false); });
    }, 180);
    return () => { cancel = true; clearTimeout(t); };
  }, [q]);

  const openCreator = (p: Profile) =>
    router.push({ pathname: '/creator/[id]', params: { id: p.handle ?? p.id, name: p.display_name ?? '', avatar: p.avatar_url ?? '' } });

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.headerRow}>
          <Ionicons name="chevron-back" size={26} color={Afryko.text} onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} />
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Afryko.textDim} />
            <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Rechercher" placeholderTextColor={Afryko.textFaint} autoFocus />
            {q.length > 0 && <Ionicons name="close-circle" size={18} color={Afryko.textFaint} onPress={() => setQ('')} />}
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
                <View style={styles.soundIcon}><Ionicons name="musical-notes" size={20} color={Afryko.violet} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.soundName} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.soundMeta}>{s.artist} · {s.uses} publications</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Afryko.textFaint} />
              </Pressable>
            ))}
          </View>
        ) : loading ? (
          <ActivityIndicator color={Afryko.violet} style={{ marginTop: 30 }} />
        ) : creators.length === 0 ? (
          <Text style={styles.emptyText}>Aucun compte trouvé{q ? ` pour « ${q} »` : ''}.</Text>
        ) : (
          <View>
            {creators.map((c) => (
              <Pressable key={c.id} style={styles.resultRow} onPress={() => openCreator(c)}>
                <Avatar uri={c.avatar_url || face(c.handle ?? c.id)} size={48} ring={c.is_verified} />
                <View style={{ flex: 1 }}>
                  <View style={styles.resultNameRow}>
                    <Text style={styles.resultName} numberOfLines={1}>{c.display_name || c.handle || 'Créateur'}</Text>
                    {c.is_verified && <Ionicons name="checkmark-circle" size={15} color={Afryko.violet} />}
                  </View>
                  <Text style={styles.resultHandle} numberOfLines={1}>@{c.handle}{c.bio ? ` · ${c.bio}` : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Afryko.textFaint} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afryko.surfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 14, height: 42 },
  searchInput: { flex: 1, ...Type.body, fontSize: 15, color: Afryko.text, height: '100%' },
  tabs: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Afryko.surfaceAlt },
  tabOn: { backgroundColor: Afryko.violet },
  tabText: { ...Type.small, fontFamily: Font.semibold, color: Afryko.text },

  emptyText: { color: Afryko.textDim, fontSize: 14, textAlign: 'center', marginTop: 34 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resultName: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text, flexShrink: 1 },
  resultHandle: { ...Type.caption, color: Afryko.textDim, marginTop: 1 },

  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  soundIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: Afryko.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  soundName: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text },
  soundMeta: { ...Type.caption, color: Afryko.textDim, marginTop: 2 },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill, backgroundColor: Afryko.surfaceAlt },
  tagText: { ...Type.body, fontFamily: Font.semibold, color: Afryko.violet },
});
