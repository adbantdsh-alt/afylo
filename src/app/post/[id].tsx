import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Linking, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { PaymentSheet, type PayItem } from '@/components/payment-sheet';
import { RichText } from '@/components/rich-text';
import { VerifiedBadge } from '@/components/verified';
import { Afylo, Font, Radius } from '@/constants/brand';
import { bumpPostView, getPost, likePost, listMyLikedPostIds, listPostsByAuthor, unlikePost } from '@/lib/db';
import { mapFeedPost } from '@/lib/feed-map';
import type { Post } from '@/lib/mock';

const W = Dimensions.get('window').width;

export default function PostViewer() {
  const router = useRouter();
  const { id, author } = useLocalSearchParams<{ id: string; author?: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const onLike = (pid: string, liked: boolean) => {
    setLikedIds((prev) => { const n = new Set(prev); if (liked) n.add(pid); else n.delete(pid); return n; });
    (liked ? likePost(pid) : unlikePost(pid)).catch(() => {});
  };

  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const didScroll = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let authorId = author;
      if (!authorId && id) authorId = (await getPost(id))?.author_id;
      const rows = authorId ? await listPostsByAuthor(authorId) : [];
      const liked = await listMyLikedPostIds();
      if (alive) { setPosts(rows.map(mapFeedPost)); setLikedIds(liked); setLoading(false); }
      if (id) bumpPostView(id).catch(() => {}); // compte la vue du post ouvert
    })().catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, author]);

  // Positionne le flux sur le post tapé une fois sa position connue.
  const tryScroll = () => {
    if (didScroll.current) return;
    const y = positions.current[id];
    if (y != null) { didScroll.current = true; requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false })); }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.hbtn}>
            <Ionicons name="arrow-back" size={24} color={Afylo.text} />
          </Pressable>
          <Text style={styles.title}>Publications</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={Afylo.violet} style={{ marginTop: 40 }} />
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={30} color={Afylo.textFaint} />
          <Text style={styles.emptyText}>Aucune publication.</Text>
        </View>
      ) : (
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          {posts.map((p) => (
            <View key={p.id} onLayout={(e) => { positions.current[p.id] = e.nativeEvent.layout.y; tryScroll(); }}>
              <PostView post={p} liked={likedIds.has(p.id)} onLike={onLike} onOpenComments={() => router.push({ pathname: '/comments/[id]', params: { id: p.id, image: p.image, name: p.name } })} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function PostView({ post, liked, onLike, onOpenComments }: { post: Post; liked: boolean; onLike: (id: string, liked: boolean) => void; onOpenComments: () => void }) {
  const router = useRouter();
  const openMention = (h: string) => router.push({ pathname: '/creator/[id]', params: { id: h } });
  const openTag = (t: string) => router.push({ pathname: '/search', params: { q: t } });
  const [idx, setIdx] = useState(0);
  const [isLiked, setIsLiked] = useState(liked);
  const [payOpen, setPayOpen] = useState(false);
  useEffect(() => setIsLiked(liked), [liked]);
  const toggleLike = () => { const nv = !isLiked; setIsLiked(nv); onLike(post.id, nv); };
  const buyProducts: PayItem[] = post.product ? [{ title: post.product.title, price: post.product.price, priceCfa: post.product.priceCfa, tiers: post.product.tiers }] : [];
  const openProduct = () => { if (post.product?.id) router.push({ pathname: '/product/[id]', params: { id: post.product.id } }); else setPayOpen(true); };
  const openLink = (url?: string) => url && Linking.openURL(url.startsWith('http') ? url : `https://${url}`).catch(() => {});
  const images = post.images && post.images.length > 1 ? post.images : post.image ? [post.image] : [];
  const mediaH = post.ratio ? Math.round(W / post.ratio) : W; // vraie proportion → pas de zoom abusif

  return (
    <View style={styles.card}>
      {/* Auteur */}
      <View style={styles.authorRow}>
        <Avatar uri={post.avatar} size={40} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={styles.name} numberOfLines={1}>{post.name}</Text>
            <VerifiedBadge kind={post.verified} size={15} />
          </View>
          <Text style={styles.time}>{post.time}</Text>
        </View>
      </View>

      {/* Média à la bonne proportion */}
      {!post.textOnly && images.length > 0 && post.video ? (
        // Vidéo : se dimensionne à sa vraie proportion → plein cadre, ni rognage ni bandes noires.
        <PostVideo uri={images[0]} width={W} initialRatio={post.ratio} />
      ) : !post.textOnly && images.length > 0 && (
        <View style={{ width: W, height: mediaH, backgroundColor: '#000' }}>
          {images.length > 1 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}>
              {images.map((uri, i) => <Image key={`${uri}-${i}`} source={{ uri }} style={{ width: W, height: mediaH }} contentFit={post.ratio ? 'cover' : 'contain'} />)}
            </ScrollView>
          ) : (
            <Image source={{ uri: images[0] }} style={{ width: W, height: mediaH }} contentFit={post.ratio ? 'cover' : 'contain'} />
          )}

          {post.overlays?.map((o) => (
            <Pressable key={o.id} onPress={() => o.kind === 'link' && openLink(o.url)} style={[styles.ovl, { left: `${o.x * 100}%`, top: `${o.y * 100}%` }]}>
              {o.kind === 'link' ? (
                <View style={styles.ovlLink}><Ionicons name="link" size={13} color="#fff" /><Text style={styles.ovlLinkText} numberOfLines={1}>{o.text || o.url}</Text></View>
              ) : (
                <Text style={[styles.ovlText, { color: o.color }]}>{o.text}</Text>
              )}
            </Pressable>
          ))}

          {images.length > 1 && (
            <View style={styles.dots} pointerEvents="none">{images.map((_, i) => <View key={i} style={[styles.dot, i === idx && styles.dotOn]} />)}</View>
          )}
        </View>
      )}

      {/* Légende */}
      {post.textOnly ? (
        <RichText text={post.caption} style={styles.textPost} linkStyle={styles.link} onPressMention={openMention} onPressTag={openTag} />
      ) : !!post.caption && (
        <RichText text={post.caption} style={styles.caption} linkStyle={styles.link} onPressMention={openMention} onPressTag={openTag} />
      )}

      {/* Produit → Acheter */}
      {post.product && (
        <View style={styles.buyBar}>
          <View style={styles.buyIcon}><Ionicons name="bag-handle" size={18} color={Afylo.ink} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.buyTitle} numberOfLines={1}>{post.product.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.buyPrice}>{post.product.price}</Text>
              {post.product.priceOld && <Text style={styles.buyPriceOld}>{post.product.priceOld}</Text>}
            </View>
          </View>
          <Pressable style={styles.buyBtn} onPress={openProduct}><Text style={styles.buyBtnText}>Acheter</Text></Pressable>
        </View>
      )}
      <PaymentSheet visible={payOpen} items={buyProducts} onClose={() => setPayOpen(false)} />

      {/* Stats + commentaires */}
      <View style={styles.stats}>
        <Pressable style={styles.stat} onPress={toggleLike}><Ionicons name={isLiked ? 'star' : 'star-outline'} size={20} color={isLiked ? Afylo.gold : Afylo.textDim} /><Text style={[styles.statN, isLiked && { color: Afylo.gold }]}>{post.likes}</Text></Pressable>
        <Pressable style={styles.stat} onPress={onOpenComments}><Ionicons name="chatbubble-outline" size={19} color={Afylo.textDim} /><Text style={styles.statN}>{post.comments}</Text></Pressable>
        <View style={styles.stat}><Ionicons name="eye-outline" size={20} color={Afylo.textDim} /><Text style={styles.statN}>{post.views}</Text></View>
      </View>
    </View>
  );
}

/** Lecture vidéo dans le détail d'un post : autoplay muet en boucle, tap = activer/couper le son. */
function PostVideo({ uri, width, initialRatio }: { uri: string; width: number; initialRatio?: number | null }) {
  const [muted, setMuted] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [inView, setInView] = useState(Platform.OS !== 'web');
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0); // progression 0..1
  const [height, setHeight] = useState(() => Math.round(width / (initialRatio || 0.8)));
  const boxRef = useRef<View>(null);
  const barW = useRef(0);
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; });

  // Visibilité (web) : la vidéo joue quand elle est à l'écran, se met en pause (et coupe le son)
  // dès qu'on scrolle au-delà.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof IntersectionObserver === 'undefined') return;
    const node = boxRef.current as any;
    if (!node?.getBoundingClientRect) return;
    const io = new IntersectionObserver(
      (entries) => { const e = entries[0]; setInView(!!e && e.isIntersecting && e.intersectionRatio >= 0.5); },
      { threshold: [0, 0.5, 1] },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // Lecture effective = visible ET non mis en pause par l'utilisateur.
  useEffect(() => {
    try { if (inView && !userPaused) player.play(); else player.pause(); } catch {}
  }, [inView, userPaused, player]);

  // Progression (curseur) + taille réelle de la vidéo (web) + état lecture.
  useEffect(() => {
    const t = setInterval(() => {
      try {
        const d = player.duration || 0;
        setPos(d > 0 ? Math.min(1, (player.currentTime || 0) / d) : 0);
        setPlaying(player.playing);
      } catch {}
      if (Platform.OS === 'web') {
        const el = (boxRef.current as any)?.querySelector?.('video') as HTMLVideoElement | null;
        if (el) {
          el.style.width = '100%'; el.style.height = '100%'; el.style.objectFit = 'cover';
          if (el.videoWidth > 0 && el.videoHeight > 0) setHeight(Math.round(width * el.videoHeight / el.videoWidth));
        }
      }
    }, 200);
    return () => clearInterval(t);
  }, [player, width]);

  const tapPlay = () => setUserPaused((v) => !v);
  const toggleMute = () => setMuted((m) => { const nm = !m; try { player.muted = nm; } catch {} return nm; });
  const seek = (frac: number) => {
    try { const d = player.duration || 0; if (d > 0) player.currentTime = Math.max(0, Math.min(d, frac * d)); setPos(Math.max(0, Math.min(1, frac))); } catch {}
  };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => barW.current > 0 && seek(e.nativeEvent.locationX / barW.current),
      onPanResponderMove: (e) => barW.current > 0 && seek(e.nativeEvent.locationX / barW.current),
    }),
  ).current;

  return (
    <View ref={boxRef} style={{ width, height, overflow: 'hidden', backgroundColor: '#000' }}>
      <VideoView player={player} style={{ width, height }} contentFit="cover" nativeControls={false} />
      {/* Zone de tap = lecture/pause */}
      <Pressable onPress={tapPlay} style={StyleSheet.absoluteFill} />
      {(userPaused || !playing) && (
        <View style={styles.playOverlay} pointerEvents="none"><View style={styles.playCircle}><Ionicons name="play" size={30} color="#fff" /></View></View>
      )}
      {/* Bouton son */}
      <Pressable onPress={toggleMute} style={styles.soundBtn} hitSlop={8}><Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={16} color="#fff" /></Pressable>
      {/* Curseur de lecture (scrubber) — avancer / reculer */}
      <View style={styles.vScrubWrap} pointerEvents="box-none">
        <View style={styles.vScrubTrack} onLayout={(e) => (barW.current = e.nativeEvent.layout.width)} {...responder.panHandlers}>
          <View style={[styles.vScrubFill, { width: `${pos * 100}%` }]} />
          <View style={[styles.vScrubThumb, { left: `${pos * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  soundBtn: { position: 'absolute', right: 12, bottom: 22, width: 34, height: 34, borderRadius: 17, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center' },
  playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
  vScrubWrap: { position: 'absolute', left: 10, right: 10, bottom: 6, height: 16, justifyContent: 'center' },
  vScrubTrack: { height: 3, borderRadius: 2, backgroundColor: '#ffffff55', justifyContent: 'center' },
  vScrubFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#fff', borderRadius: 2 },
  vScrubThumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', marginLeft: -6 },
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  hbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Afylo.text, fontSize: 18, fontFamily: Font.bold },
  empty: { alignItems: 'center', gap: 10, marginTop: 60 },
  emptyText: { color: Afylo.textDim, fontSize: 15 },

  card: { borderBottomWidth: 8, borderBottomColor: Afylo.surfaceAlt },
  authorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  name: { color: Afylo.text, fontSize: 15, fontFamily: Font.bold },
  time: { color: Afylo.textDim, fontSize: 12, marginTop: 1 },

  ovl: { position: 'absolute', maxWidth: '80%' },
  ovlText: { fontSize: 20, fontFamily: Font.bold, textShadowColor: '#00000088', textShadowRadius: 4 },
  ovlLink: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0A84FFe6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  ovlLinkText: { color: '#fff', fontSize: 13, fontFamily: Font.semibold },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff88' },
  dotOn: { backgroundColor: '#fff', width: 7, height: 7, borderRadius: 3.5 },

  caption: { color: Afylo.text, fontSize: 15, lineHeight: 21, paddingHorizontal: 16, paddingTop: 12 },
  link: { color: Afylo.violet, fontFamily: Font.semibold },
  textPost: { color: Afylo.text, fontSize: 16, lineHeight: 23, paddingHorizontal: 16, paddingTop: 8 },

  buyBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, backgroundColor: Afylo.surface, borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: Afylo.border },
  buyIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Afylo.gold, alignItems: 'center', justifyContent: 'center' },
  buyTitle: { color: Afylo.text, fontSize: 14, fontFamily: Font.semibold },
  buyPrice: { color: Afylo.gold, fontSize: 14, fontFamily: Font.bold, marginTop: 1 },
  buyPriceOld: { color: Afylo.textFaint, fontSize: 12, fontFamily: Font.semibold, textDecorationLine: 'line-through' },
  buyBtn: { backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  buyBtnText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },

  stats: { flexDirection: 'row', gap: 26, paddingHorizontal: 16, paddingVertical: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statN: { color: Afylo.textDim, fontSize: 14, fontFamily: Font.semibold },
});
