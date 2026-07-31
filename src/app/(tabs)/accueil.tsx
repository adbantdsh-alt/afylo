import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, IconButton } from '@/components/ui-kit';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { useHideOnScroll } from '@/lib/tabbar';
import { me, posts, type Post } from '@/lib/mock';
import { useStories } from '@/lib/stories';

export default function Feed() {
  const scroll = useHideOnScroll();
  const router = useRouter();
  const { stories, myStory } = useStories();
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            Afylo<Text style={{ color: Afylo.violet }}>.</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <IconButton name="search" />
            <IconButton name="notifications-outline" />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }} {...scroll}>
        {/* Lives en direct */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.livesRow}>
          {/* Ta story */}
          <Pressable
            style={styles.liveItem}
            onPress={() => (myStory ? router.push({ pathname: '/story/[uid]', params: { uid: myStory.id } }) : router.push('/creer'))}>
            <View>
              <Avatar uri={myStory?.avatar ?? me.avatar} size={64} ring={!!myStory} />
              {!myStory && (
                <View style={styles.plusBadge}>
                  <Ionicons name="add" size={14} color="#fff" />
                </View>
              )}
            </View>
            <Text style={styles.liveName}>Ta story</Text>
          </Pressable>

          {stories.filter((s) => !s.mine).map((s) => (
            <Pressable
              key={s.id}
              style={styles.liveItem}
              onPress={() => router.push({ pathname: '/story/[uid]', params: { uid: s.id } })}>
              <Avatar uri={s.avatar} size={64} live={s.live} ring={!s.live} />
              {s.live && (
                <View style={styles.liveTag}>
                  <Text style={styles.liveTagText}>LIVE</Text>
                </View>
              )}
              <Text style={styles.liveName} numberOfLines={1}>{s.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </ScrollView>
    </View>
  );
}

function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const gate = useAuthGate();
  const [followed, setFollowed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bought, setBought] = useState(false);
  const [reposted, setReposted] = useState(false);

  const toggleFollow = () => { if (gate('suivre ce créateur')) setFollowed((v) => !v); };
  const toggleLike = () => { if (gate('aimer')) setLiked((v) => !v); };
  const buy = () => { if (gate('acheter')) setBought(true); };
  const repost = () => { if (gate('republier')) setReposted((v) => !v); };
  const openComments = () => router.push({ pathname: '/comments/[id]', params: { id: post.id } });

  const openProfile = () =>
    router.push({
      pathname: '/creator/[id]',
      params: { id: post.handle, name: post.name, avatar: post.avatar, badge: post.badge ?? '' },
    });

  return (
    <View style={styles.card}>
      {/* En-tête */}
      <View style={styles.cardHeader}>
        <Pressable onPress={openProfile} style={styles.cardHeaderTap}>
          <Avatar uri={post.avatar} size={44} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.name}>{post.name}</Text>
            </View>
            <Text style={styles.time}>{post.time}</Text>
          </View>
        </Pressable>
        <Pressable onPress={toggleFollow} style={[styles.followBtn, followed && styles.followBtnOn]}>
          <Text style={[styles.followText, followed && styles.followTextOn]}>{followed ? 'Suivi' : 'Suivre'}</Text>
        </Pressable>
      </View>

      {/* Média */}
      <Pressable style={styles.media} onPress={toggleLike}>
        <Image source={{ uri: post.image }} style={styles.mediaImg} contentFit="cover" transition={250} />
        <View style={styles.playBadge}>
          <Ionicons name="play" size={13} color="#fff" />
          <Text style={styles.playText}>0:24</Text>
        </View>
      </Pressable>

      {/* Barre "Acheter" (live shopping) */}
      {post.product && (
        <View style={styles.buyBar}>
          <View style={styles.buyIcon}>
            <Ionicons name="bag-handle" size={18} color={Afylo.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.buyTitle} numberOfLines={1}>
              {post.product.title}
            </Text>
            <Text style={styles.buyPrice}>{post.product.price}</Text>
          </View>
          <Pressable onPress={buy} style={[styles.buyCta, bought && { backgroundColor: Afylo.green }]}>
            <Text style={[styles.buyCtaText, bought && { color: '#fff' }]}>{bought ? 'Ajouté ✓' : 'Acheter'}</Text>
          </Pressable>
        </View>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <Pressable onPress={toggleLike}>
          <Stat icon={liked ? 'heart' : 'heart-outline'} label={bumpLike(post.likes, liked)} color={liked ? Afylo.live : Afylo.inkDim} />
        </Pressable>
        <Pressable onPress={openComments}>
          <Stat icon="chatbubble-ellipses" label={post.comments} />
        </Pressable>
        <Pressable onPress={repost}>
          <Stat icon="repeat" label={reposted ? 'Republié' : post.shares} color={reposted ? Afylo.green : Afylo.inkDim} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Stat icon="eye" label={post.views} />
      </View>

      <Text style={styles.caption}>{post.caption}</Text>
    </View>
  );
}

/** +1 visuel quand on like (les compteurs façon "7.2k" restent tels quels). */
function bumpLike(base: string, liked: boolean): string {
  if (!liked) return base;
  if (/[a-zA-Z]/.test(base)) return base; // "7.2 K" etc. : on ne recalcule pas
  const n = parseInt(base.replace(/\s/g, ''), 10);
  return isNaN(n) ? base : String(n + 1);
}

function Stat({
  icon,
  label,
  color = Afylo.inkDim,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  brand: { color: Afylo.text, fontFamily: Font.bold, fontSize: 24, letterSpacing: -0.6 },

  livesRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 16 },
  liveItem: { alignItems: 'center', width: 72 },
  liveName: { color: Afylo.textDim, fontSize: 12, marginTop: 6 },
  liveTag: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    backgroundColor: Afylo.live,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  liveTagText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    backgroundColor: Afylo.violet,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Afylo.bg,
  },

  card: {
    backgroundColor: Afylo.card,
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: Radius.xl,
    padding: 12,
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardHeaderTap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  name: { color: Afylo.ink, fontFamily: Font.semibold, fontSize: 15, letterSpacing: -0.2 },
  time: { color: Afylo.textFaint, fontFamily: Font.regular, fontSize: 12, marginTop: 2 },
  followBtn: { backgroundColor: Afylo.violet, paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.pill },
  followBtnOn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Afylo.border, paddingHorizontal: 16 },
  followText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  followTextOn: { color: Afylo.text },

  media: { borderRadius: Radius.lg, overflow: 'hidden', aspectRatio: 1.05, backgroundColor: Afylo.surfaceAlt },
  mediaImg: { flex: 1 },
  playBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00000099',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  playText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  buyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FBEBE0',
    borderRadius: Radius.md,
    padding: 8,
    marginTop: 10,
  },
  buyIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  buyTitle: { color: Afylo.ink, fontSize: 13, fontWeight: '700' },
  buyPrice: { color: Afylo.violet, fontSize: 14, fontWeight: '800', marginTop: 1 },
  buyCta: { backgroundColor: Afylo.violet, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill },
  buyCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  stats: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { ...Type.small, color: Afylo.inkDim },
  caption: { ...Type.body, color: Afylo.ink, marginTop: 12 },
});
