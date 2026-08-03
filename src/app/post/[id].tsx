import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { VerifiedBadge } from '@/components/verified';
import { Afryko, Font, Radius } from '@/constants/brand';
import { getPost } from '@/lib/db';
import { mapFeedPost } from '@/lib/feed-map';
import type { Post } from '@/lib/mock';

const W = Dimensions.get('window').width;

export default function PostViewer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    getPost(id)
      .then((fp) => setPost(fp ? mapFeedPost(fp) : null))
      .finally(() => setLoading(false));
  }, [id]);

  const openComments = () =>
    post && router.push({ pathname: '/comments/[id]', params: { id: post.id, image: post.image, name: post.name } });
  const openLink = (url?: string) => url && Linking.openURL(url.startsWith('http') ? url : `https://${url}`).catch(() => {});
  const images = post?.images && post.images.length > 1 ? post.images : post?.image ? [post.image] : [];

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.hbtn}>
            <Ionicons name="arrow-back" size={24} color={Afryko.text} />
          </Pressable>
          <Text style={styles.title}>Publication</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={Afryko.violet} style={{ marginTop: 40 }} />
      ) : !post ? (
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={30} color={Afryko.textFaint} />
          <Text style={styles.emptyText}>Publication introuvable.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Auteur */}
          <View style={styles.authorRow}>
            <Avatar uri={post.avatar} size={42} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={styles.name} numberOfLines={1}>{post.name}</Text>
                <VerifiedBadge kind={post.verified} size={15} />
              </View>
              <Text style={styles.time}>{post.time}</Text>
            </View>
          </View>

          {/* Média — image ENTIÈRE (contain), jamais rognée/zoomée */}
          {!post.textOnly && images.length > 0 && (
            <View style={styles.media}>
              {images.length > 1 ? (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}>
                  {images.map((uri, i) => (
                    <Image key={`${uri}-${i}`} source={{ uri }} style={{ width: W, height: W }} contentFit="contain" />
                  ))}
                </ScrollView>
              ) : (
                <Image source={{ uri: images[0] }} style={{ width: W, height: W }} contentFit="contain" />
              )}

              {/* Calques texte/lien */}
              {post.overlays?.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => o.kind === 'link' && openLink(o.url)}
                  style={[styles.ovl, { left: `${o.x * 100}%`, top: `${o.y * 100}%` }]}>
                  {o.kind === 'link' ? (
                    <View style={styles.ovlLink}><Ionicons name="link" size={13} color="#fff" /><Text style={styles.ovlLinkText} numberOfLines={1}>{o.text || o.url}</Text></View>
                  ) : (
                    <Text style={[styles.ovlText, { color: o.color }]}>{o.text}</Text>
                  )}
                </Pressable>
              ))}

              {images.length > 1 && (
                <View style={styles.dots} pointerEvents="none">
                  {images.map((_, i) => <View key={i} style={[styles.dot, i === idx && styles.dotOn]} />)}
                </View>
              )}
            </View>
          )}

          {/* Légende */}
          {!!post.caption && <Text style={styles.caption}>{post.caption}</Text>}

          {/* Produit → Acheter */}
          {post.product && (
            <View style={styles.buyBar}>
              <View style={styles.buyIcon}><Ionicons name="bag-handle" size={18} color={Afryko.ink} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.buyTitle} numberOfLines={1}>{post.product.title}</Text>
                <Text style={styles.buyPrice}>{post.product.price}</Text>
              </View>
              <Pressable style={styles.buyBtn}><Text style={styles.buyBtnText}>Acheter</Text></Pressable>
            </View>
          )}

          {/* Stats + accès commentaires */}
          <View style={styles.stats}>
            <View style={styles.stat}><Ionicons name="star-outline" size={20} color={Afryko.textDim} /><Text style={styles.statN}>{post.likes}</Text></View>
            <Pressable style={styles.stat} onPress={openComments}><Ionicons name="chatbubble-outline" size={19} color={Afryko.textDim} /><Text style={styles.statN}>{post.comments}</Text></Pressable>
            <View style={styles.stat}><Ionicons name="eye-outline" size={20} color={Afryko.textDim} /><Text style={styles.statN}>{post.views}</Text></View>
          </View>

          <Pressable style={styles.commentsBtn} onPress={openComments}>
            <Ionicons name="chatbubbles-outline" size={18} color={Afryko.violet} />
            <Text style={styles.commentsBtnText}>Voir les commentaires</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  hbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Afryko.text, fontSize: 18, fontFamily: Font.bold },
  empty: { alignItems: 'center', gap: 10, marginTop: 60 },
  emptyText: { color: Afryko.textDim, fontSize: 15 },

  authorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  name: { color: Afryko.text, fontSize: 15, fontFamily: Font.bold },
  time: { color: Afryko.textDim, fontSize: 12, marginTop: 1 },

  media: { width: W, height: W, backgroundColor: '#000' },
  ovl: { position: 'absolute', maxWidth: '80%' },
  ovlText: { fontSize: 20, fontFamily: Font.bold, textShadowColor: '#00000088', textShadowRadius: 4 },
  ovlLink: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0A84FFe6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  ovlLinkText: { color: '#fff', fontSize: 13, fontFamily: Font.semibold },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff88' },
  dotOn: { backgroundColor: '#fff', width: 7, height: 7, borderRadius: 3.5 },

  caption: { color: Afryko.text, fontSize: 15, lineHeight: 21, paddingHorizontal: 16, paddingTop: 14 },

  buyBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 14, backgroundColor: Afryko.surface, borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: Afryko.border },
  buyIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Afryko.gold, alignItems: 'center', justifyContent: 'center' },
  buyTitle: { color: Afryko.text, fontSize: 14, fontFamily: Font.semibold },
  buyPrice: { color: Afryko.gold, fontSize: 14, fontFamily: Font.bold, marginTop: 1 },
  buyBtn: { backgroundColor: Afryko.violet, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  buyBtnText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },

  stats: { flexDirection: 'row', gap: 26, paddingHorizontal: 16, paddingTop: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statN: { color: Afryko.textDim, fontSize: 14, fontFamily: Font.semibold },

  commentsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, backgroundColor: Afryko.surface, borderRadius: Radius.md, paddingVertical: 13, justifyContent: 'center', borderWidth: 1, borderColor: Afryko.border },
  commentsBtnText: { color: Afryko.violet, fontFamily: Font.semibold, fontSize: 15 },
});
