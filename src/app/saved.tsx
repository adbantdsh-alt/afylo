import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font } from '@/constants/brand';
import { listSavedPosts } from '@/lib/db';
import { mapFeedPost } from '@/lib/feed-map';
import type { Post } from '@/lib/mock';

export default function Saved() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSavedPosts().then((rows) => setPosts(rows.map(mapFeedPost))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/profil'))} style={styles.hbtn}>
            <Ionicons name="arrow-back" size={24} color={Afylo.text} />
          </Pressable>
          <Text style={styles.title}>Enregistrements</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={Afylo.violet} style={{ marginTop: 40 }} />
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={34} color={Afylo.textFaint} />
          <Text style={styles.emptyTitle}>Aucun enregistrement</Text>
          <Text style={styles.emptySub}>Appuie sur « Enregistrer » (menu ⋯ d'un post) pour le retrouver ici.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 2 }}>
          <View style={styles.grid}>
            {posts.map((p) => (
              <Pressable key={p.id} style={styles.cell} onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id, author: p.authorId ?? '' } })}>
                <Image source={{ uri: p.image || undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                {p.video && (
                  <View style={styles.tag}><Ionicons name="play" size={11} color="#fff" /></View>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const GAP = 2;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  hbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Afylo.text, fontSize: 18, fontFamily: Font.bold },
  empty: { alignItems: 'center', gap: 8, marginTop: 70, paddingHorizontal: 40 },
  emptyTitle: { color: Afylo.text, fontSize: 16, fontFamily: Font.bold, marginTop: 6 },
  emptySub: { color: Afylo.textDim, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { width: `${(100 - 2) / 3}%`, aspectRatio: 1, backgroundColor: Afylo.surfaceAlt, overflow: 'hidden' },
  tag: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center' },
});
