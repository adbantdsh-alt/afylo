import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Badge, IconButton } from '@/components/ui-kit';
import { Afylo, Radius } from '@/constants/brand';
import { lives, me, posts, type Post } from '@/lib/mock';

export default function Feed() {
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Lives en direct */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.livesRow}>
          <View style={styles.liveItem}>
            <View>
              <Avatar uri={me.avatar} size={64} />
              <View style={styles.plusBadge}>
                <Ionicons name="add" size={14} color="#fff" />
              </View>
            </View>
            <Text style={styles.liveName}>Ton live</Text>
          </View>
          {lives.map((l) => (
            <View key={l.id} style={styles.liveItem}>
              <Avatar uri={l.avatar} size={64} live={l.live} ring={!l.live} />
              {l.live && (
                <View style={styles.liveTag}>
                  <Text style={styles.liveTagText}>LIVE</Text>
                </View>
              )}
              <Text style={styles.liveName}>{l.name}</Text>
            </View>
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
  const badgeColor = post.badge === 'boutique' ? Afylo.gold : Afylo.violet;
  const [followed, setFollowed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bought, setBought] = useState(false);

  return (
    <View style={styles.card}>
      {/* En-tête */}
      <View style={styles.cardHeader}>
        <Avatar uri={post.avatar} size={44} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.name}>{post.name}</Text>
            {post.badge && <Badge label={post.badge} color={badgeColor} />}
          </View>
          <Text style={styles.time}>{post.time}</Text>
        </View>
        <Pressable onPress={() => setFollowed((v) => !v)} style={[styles.followBtn, followed && styles.followBtnOn]}>
          <Text style={[styles.followText, followed && styles.followTextOn]}>{followed ? 'Suivi' : 'Suivre'}</Text>
        </Pressable>
      </View>

      {/* Média */}
      <Pressable style={styles.media} onPress={() => setLiked((v) => !v)}>
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
          <Pressable onPress={() => setBought(true)} style={[styles.buyCta, bought && { backgroundColor: Afylo.green }]}>
            <Text style={[styles.buyCtaText, bought && { color: '#fff' }]}>{bought ? 'Ajouté ✓' : 'Acheter'}</Text>
          </Pressable>
        </View>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <Pressable onPress={() => setLiked((v) => !v)}>
          <Stat icon={liked ? 'heart' : 'heart-outline'} label={bumpLike(post.likes, liked)} color={liked ? Afylo.live : Afylo.inkDim} />
        </Pressable>
        <Stat icon="chatbubble-ellipses" label={post.comments} />
        <Stat icon="eye" label={post.views} />
        <View style={{ flex: 1 }} />
        <Stat icon="arrow-redo" label={post.shares} />
      </View>

      <Text style={styles.caption}>{post.caption}</Text>
    </View>
  );
}

/** +1 visuel quand on like (les compteurs façon "7.2k" restent tels quels). */
function bumpLike(base: string, liked: boolean): string {
  if (!liked) return base;
  if (base.includes('k') || base.includes('M')) return base;
  const n = parseInt(base, 10);
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
  brand: { color: Afylo.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

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
  name: { color: Afylo.ink, fontSize: 15, fontWeight: '700' },
  time: { color: Afylo.inkDim, fontSize: 12, marginTop: 2 },
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
  statText: { color: Afylo.inkDim, fontSize: 13, fontWeight: '600' },
  caption: { color: Afylo.ink, fontSize: 14, lineHeight: 20, marginTop: 10 },
});
