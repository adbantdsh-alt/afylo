import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { VerifiedBadge, verifiedKind } from '@/components/verified';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { searchPosts, searchProfiles, type SearchPost } from '@/lib/db';
import { face, photo } from '@/lib/mock';
import { searchSounds } from '@/lib/sounds';
import type { Profile } from '@/types/db';

const TABS = ['Créateurs', 'Vidéos', 'Sons', 'Tags'];
const TAGS = ['#dakar', '#waxstyle', '#afrobeats', '#tutoriel', '#liveshopping', '#senegal', '#beaute', '#mode'];

export default function Search() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q ?? '');
  const [tab, setTab] = useState(params.q ? 1 : 0); // arrivé avec un tag/terme → onglet Vidéos
  const [creators, setCreators] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Recherche RÉELLE (Supabase) selon l'onglet actif, avec léger anti-rebond
  useEffect(() => {
    if (tab !== 0 && tab !== 1) return;
    let cancel = false;
    setLoading(true);
    const t = setTimeout(() => {
      const run = tab === 1 ? searchPosts(q).then((r) => { if (!cancel) setPosts(r); }) : searchProfiles(q).then((r) => { if (!cancel) setCreators(r); });
      run.catch(() => {}).finally(() => { if (!cancel) setLoading(false); });
    }, 180);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, tab]);

  const openCreator = (p: Profile) =>
    router.push({ pathname: '/creator/[id]', params: { id: p.handle ?? p.id, name: p.display_name ?? '', avatar: p.avatar_url ?? '' } });
  const openPost = (p: SearchPost) =>
    router.push({ pathname: '/comments/[id]', params: { id: p.id, image: p.thumbnail_url || p.media_url || '' } });
  const openTag = (t: string) => { setQ(t.replace('#', '')); setTab(1); };

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
              <Pressable key={t} style={styles.tagPill} onPress={() => openTag(t)}>
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
        ) : loading ? (
          <ActivityIndicator color={Afylo.violet} style={{ marginTop: 30 }} />
        ) : tab === 1 ? (
          posts.length === 0 ? (
            <Text style={styles.emptyText}>Aucune vidéo trouvée{q ? ` pour « ${q} »` : ''}.</Text>
          ) : (
            <View style={styles.videoGrid}>
              {posts.map((p) => (
                <Pressable key={p.id} style={styles.videoCell} onPress={() => openPost(p)}>
                  <Image source={{ uri: p.thumbnail_url || p.media_url || photo(p.id, 300, 400) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                  {p.caption ? <View style={styles.videoCap}><Text style={styles.videoCapText} numberOfLines={1}>{p.caption}</Text></View> : null}
                </Pressable>
              ))}
            </View>
          )
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
                    <VerifiedBadge kind={verifiedKind(c)} size={15} />
                  </View>
                  <Text style={styles.resultHandle} numberOfLines={1}>@{c.handle}{c.bio ? ` · ${c.bio}` : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Afylo.textFaint} />
              </Pressable>
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

  emptyText: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', marginTop: 34 },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  videoCell: { width: '32.4%', aspectRatio: 0.72, borderRadius: 10, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt, justifyContent: 'flex-end' },
  videoCap: { backgroundColor: '#00000088', paddingHorizontal: 6, paddingVertical: 4 },
  videoCapText: { color: '#fff', fontSize: 10 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resultName: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text, flexShrink: 1 },
  resultHandle: { ...Type.caption, color: Afylo.textDim, marginTop: 1 },

  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  soundIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: Afylo.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  soundName: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  soundMeta: { ...Type.caption, color: Afylo.textDim, marginTop: 2 },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill, backgroundColor: Afylo.surfaceAlt },
  tagText: { ...Type.body, fontFamily: Font.semibold, color: Afylo.violet },
});
