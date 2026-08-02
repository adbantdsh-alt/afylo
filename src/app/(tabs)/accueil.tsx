import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, IconButton } from '@/components/ui-kit';
import { PaymentSheet } from '@/components/payment-sheet';
import { PostOptionsSheet } from '@/components/post-options-sheet';
import { RateSheet } from '@/components/rate-sheet';
import { RatingStar } from '@/components/rating-star';
import { ReportSheet } from '@/components/report-sheet';
import { RepostSheet } from '@/components/repost-sheet';
import { FeedSkeleton } from '@/components/skeleton';
import { BuzzBadge } from '@/components/buzz-badge';
import { useIsBuzz } from '@/lib/buzz';
import { VerifiedBadge } from '@/components/verified';
import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { createTextPost, deletePost, followUser, listConversations, listFeed, unfollowUser, unreadNotifCount, updatePostCaption } from '@/lib/db';
import { mapFeed } from '@/lib/feed-map';
import { useMe } from '@/lib/me';
import { useReposts } from '@/lib/reposts';
import { useAlwaysShowTabBar } from '@/lib/tabbar';
import { type Post } from '@/lib/mock';
import { badgeText } from '@/lib/notifs';
import { useStories } from '@/lib/stories';

const REPOSTED_COLOR = '#16A34A'; // vert vif, bien visible une fois republié

export default function Feed() {
  const router = useRouter();
  const gate = useAuthGate();
  const { stories, myStory } = useStories();
  const showTabBar = useAlwaysShowTabBar();
  const { avatar: myAvatar, name: myName, handle: myHandle, isPro } = useMe(); // profil connecté, partagé
  const [feed, setFeed] = useState<Post[]>([]); // réseau réel (Supabase) — plus de données fictives
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0); // notifications + messages non lus (badge cloche)

  const publishText = () => {
    const t = composeText.trim();
    if (!t) return;
    if (editingId) {
      setFeed((prev) => prev.map((x) => (x.id === editingId ? { ...x, caption: t } : x)));
      if (!editingId.startsWith('txt')) updatePostCaption(editingId, t).catch(() => {});
    } else {
      // Ajout optimiste puis persistance réelle (le post texte doit survivre + apparaître au profil)
      const tempId = `txt${Date.now()}`;
      const post: Post = { id: tempId, name: myName, handle: `@${myHandle}`, avatar: myAvatar, time: "à l'instant", image: '', likes: '0', comments: '0', views: '0', shares: '0', caption: t, textOnly: true };
      setFeed((prev) => [post, ...prev]);
      createTextPost(t)
        .then((row) => setFeed((prev) => prev.map((x) => (x.id === tempId ? { ...x, id: row.id } : x))))
        .catch(() => {});
    }
    setComposeText('');
    setEditingId(null);
    setComposeOpen(false);
  };
  const removePost = (id: string) => {
    setFeed((prev) => prev.filter((p) => p.id !== id));
    if (!id.startsWith('txt')) deletePost(id).catch(() => {});
  };
  const editPost = (p: Post) => { setComposeText(p.caption); setEditingId(p.id); setComposeOpen(true); };

  // Nav bar persistante sur l'accueil + compteur cloche (notifs + messages non lus)
  useFocusEffect(useCallback(() => {
    showTabBar();
    Promise.all([unreadNotifCount(), listConversations()])
      .then(([n, convos]) => setUnread(n + convos.reduce((s, c) => s + c.unread, 0)))
      .catch(() => {});
  }, [showTabBar]));
  useEffect(() => {
    // Vrai réseau : uniquement les posts de Supabase (aucune donnée fictive)
    listFeed().then((rows) => setFeed(mapFeed(rows ?? []))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            Afryko<Text style={{ color: Afryko.violet }}>.</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <IconButton name="create-outline" onPress={() => { if (gate('publier')) setComposeOpen(true); }} />
            <IconButton name="search" onPress={() => router.push('/search')} />
            <View>
              <IconButton name="notifications-outline" onPress={() => router.push('/notifications')} />
              {unread > 0 && (
                <View style={styles.bellBadge} pointerEvents="none">
                  <Text style={styles.bellBadgeText}>{badgeText(unread)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
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
              <Avatar uri={myStory?.avatar ?? myAvatar} size={64} ring={!!myStory} />
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
              onPress={() =>
                s.live
                  ? router.push({ pathname: '/live', params: { role: 'viewer', name: s.name, avatar: s.avatar } })
                  : router.push({ pathname: '/story/[uid]', params: { uid: s.id } })
              }>
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

        {loading && feed.length === 0 ? (
          <FeedSkeleton count={3} />
        ) : feed.length === 0 ? (
          <View style={styles.feedState}>
            <Ionicons name="planet-outline" size={44} color={Afryko.textFaint} />
            <Text style={styles.feedEmptyTitle}>Ton feed est vide</Text>
            <Text style={styles.feedEmptySub}>Suis des créateurs ou publie ta première vidéo pour lancer ton réseau.</Text>
          </View>
        ) : (
          feed.map((p) => (
            <PostCard key={p.id} post={p} isPro={isPro} myHandle={myHandle} onDeletePost={removePost} onEditPost={editPost} />
          ))
        )}
      </ScrollView>

      {/* Composer une publication texte (façon X) */}
      <Modal visible={composeOpen} animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Afryko.bg }}>
          <View style={styles.composeHead}>
            <Pressable onPress={() => setComposeOpen(false)}><Text style={styles.composeCancel}>Annuler</Text></Pressable>
            <Pressable onPress={publishText} disabled={!composeText.trim()} style={[styles.composePublish, !composeText.trim() && { opacity: 0.5 }]}>
              <Text style={styles.composePublishText}>Publier</Text>
            </Pressable>
          </View>
          <View style={styles.composeBody}>
            <Avatar uri={myAvatar} size={44} />
            <TextInput
              style={styles.composeInput}
              value={composeText}
              onChangeText={setComposeText}
              placeholder="Quoi de neuf ?"
              placeholderTextColor={Afryko.textFaint}
              multiline
              autoFocus
              maxLength={500}
            />
          </View>
          <Text style={styles.composeCount}>{composeText.length}/500</Text>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function PostCard({ post, isPro, myHandle, onDeletePost, onEditPost }: { post: Post; isPro: boolean; myHandle: string; onDeletePost: (id: string) => void; onEditPost: (p: Post) => void }) {
  const router = useRouter();
  const gate = useAuthGate();
  const { addRepost, hasReposted } = useReposts();
  const [followed, setFollowed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bought, setBought] = useState(false);
  const [rating, setRating] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const lastTap = useRef(0);
  const pop = useRef(new Animated.Value(0)).current;

  // Repartage = seulement pour les produits en affiliation (le vendeur a défini une commission)
  const canAffiliate = !!post.product?.commission;
  const reposted = hasReposted(post.id);

  const toggleFollow = () => {
    if (!gate('suivre ce créateur')) return;
    const next = !followed;
    setFollowed(next); // optimiste
    if (post.authorId) {
      (next ? followUser(post.authorId) : unfollowUser(post.authorId)).catch(() => setFollowed(!next));
    }
  };
  const toggleLike = () => { if (gate('aimer')) setLiked((v) => !v); };
  const buy = () => { if (gate('acheter')) setPayOpen(true); };
  const repost = () => { if (gate('republier')) setRepostOpen(true); };
  const owns = post.handle === `@${myHandle}` || post.handle === myHandle;
  const isBuzz = useIsBuzz(post.id);
  const openComments = () => router.push({ pathname: '/comments/[id]', params: { id: post.id, owner: owns ? '1' : '', image: post.image } });

  // Double-tap image = j'aime + pop d'animation (dopamine)
  const heartPop = () => {
    pop.setValue(0);
    Animated.sequence([
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      Animated.timing(pop, { toValue: 0, duration: 350, delay: 250, useNativeDriver: true }),
    ]).start();
  };
  const onMediaTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) { if (gate('aimer')) { setLiked(true); heartPop(); } }
    lastTap.current = now;
  };
  const share = async () => { try { await Share.share({ message: `${post.name} sur Afryko : ${post.caption}` }); } catch {} };

  const openProfile = () =>
    router.push({
      pathname: '/creator/[id]',
      params: { id: post.handle, name: post.name, avatar: post.avatar, badge: post.badge ?? '' },
    });

  if (hidden) return null;

  return (
    <View style={styles.card}>
      {/* En-tête */}
      <View style={styles.cardHeader}>
        <Pressable onPress={openProfile} style={styles.cardHeaderTap}>
          <Avatar uri={post.avatar} size={44} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={styles.name} numberOfLines={1}>{post.name}</Text>
              <VerifiedBadge kind={post.verified} size={15} />
              {isBuzz && <BuzzBadge size="sm" />}
            </View>
            <Text style={styles.time}>{post.time}</Text>
          </View>
        </Pressable>
        <Pressable onPress={toggleFollow} style={[styles.followBtn, followed && styles.followBtnOn]}>
          <Text style={[styles.followText, followed && styles.followTextOn]}>{followed ? 'Suivi' : 'Suivre'}</Text>
        </Pressable>
        <Pressable onPress={() => setOptionsOpen(true)} style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Afryko.inkDim} />
        </Pressable>
      </View>

      {/* Média — plein cadre, sans arrondi. Double-tap = j'aime (masqué pour les posts texte) */}
      {!post.textOnly && (
        <Pressable style={styles.media} onPress={onMediaTap}>
          <Image source={{ uri: post.image }} style={styles.mediaImg} contentFit="cover" transition={250} blurRadius={post.sensitive && !revealed ? 30 : 0} />
          <View style={styles.playBadge}>
            <Ionicons name="play" size={13} color="#fff" />
            <Text style={styles.playText}>0:24</Text>
          </View>
          {post.sensitive && !revealed && (
            <Pressable style={styles.sensitiveOverlay} onPress={() => setRevealed(true)}>
              <Ionicons name="eye-off-outline" size={28} color="#fff" />
              <Text style={styles.sensitiveTitle}>Contenu sensible</Text>
              <Text style={styles.sensitiveSub}>{post.sensitive} · appuie pour afficher</Text>
              <View style={styles.sensitiveBtn}><Text style={styles.sensitiveBtnText}>Afficher</Text></View>
            </Pressable>
          )}
          <Animated.View pointerEvents="none" style={[styles.heartPop, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]}>
            <Ionicons name="star" size={110} color="#fff" style={styles.heartPopShadow} />
          </Animated.View>
        </Pressable>
      )}

      <View style={styles.body}>
      {/* Publication texte (façon X) */}
      {post.textOnly && <Text style={styles.textPost}>{post.caption}</Text>}

      {/* Barre "Acheter" (live shopping) */}
      {post.product && (
        <View style={styles.buyBar}>
          <View style={styles.buyIcon}>
            <Ionicons name="bag-handle" size={18} color={Afryko.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.buyTitle} numberOfLines={1}>
              {post.products && post.products.length > 1 ? `${post.products.length} produits · à partir de` : post.product.title}
            </Text>
            <Text style={styles.buyPrice}>{post.product.price}</Text>
          </View>
          <Pressable onPress={buy} style={[styles.buyCta, bought && { backgroundColor: Afryko.green }]}>
            <Text style={[styles.buyCtaText, bought && { color: '#fff' }]}>{bought ? 'Ajouté ✓' : 'Acheter'}</Text>
          </Pressable>
        </View>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        {/* Réaction fusionnée — tap = j'aime · appui long = note /10 (remplace like + Noter) */}
        <Pressable
          onPress={toggleLike}
          onLongPress={() => { if (gate('noter')) setRateOpen(true); }}
          delayLongPress={260}
          style={styles.rate}>
          {reaction ? (
            <Text style={styles.rateEmoji}>{reaction}</Text>
          ) : (
            <RatingStar fill={rating > 0 ? rating / 10 : liked ? 1 : 0} size={19} color={Afryko.violet} empty={Afryko.inkDim} />
          )}
          <Text style={[styles.statText, (liked || rating > 0 || reaction) && { color: Afryko.violet, fontFamily: Font.bold }]}>
            {rating > 0 ? `${rating}/10` : bumpLike(post.likes, liked)}
          </Text>
        </Pressable>
        <Pressable onPress={openComments}>
          <Stat icon="chatbubble-ellipses" label={post.comments} />
        </Pressable>
        <Pressable onPress={repost}>
          <Stat icon="repeat" label={reposted ? 'Republié' : post.shares} color={reposted ? REPOSTED_COLOR : Afryko.inkDim} bold={reposted} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Stat icon="eye" label={post.views} />
      </View>

      {!post.textOnly && <Text style={styles.caption}>{post.caption}</Text>}

      {post.sound && (
        <Pressable onPress={() => router.push({ pathname: '/sound/[id]', params: { id: post.sound!.id } })} style={styles.soundRow}>
          <Ionicons name="musical-notes" size={14} color={Afryko.text} />
          <Text style={styles.soundText} numberOfLines={1}>{post.sound.title} · {post.sound.artist}</Text>
        </Pressable>
      )}
      </View>

      <PostOptionsSheet
        visible={optionsOpen}
        saved={saved}
        isOwner={owns}
        onClose={() => setOptionsOpen(false)}
        onShare={share}
        onInterested={() => setLiked(true)}
        onNotInterested={() => setHidden(true)}
        onSave={() => setSaved((v) => !v)}
        onReport={() => setReportOpen(true)}
        onEdit={() => onEditPost(post)}
        onDelete={() => onDeletePost(post.id)}
      />

      <RateSheet
        visible={rateOpen}
        rating={rating}
        reaction={reaction}
        onRate={setRating}
        onReact={(e) => setReaction((r) => (r === e ? null : e))}
        onClose={() => setRateOpen(false)}
      />

      <PaymentSheet
        visible={payOpen}
        items={post.products ?? (post.product ? [{ title: post.product.title, price: post.product.price }] : [])}
        onClose={() => setPayOpen(false)}
      />

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} />

      <RepostSheet
        visible={repostOpen}
        post={{ id: post.id, name: post.name, avatar: post.avatar, caption: post.caption, image: post.image, product: post.product }}
        isPro={isPro}
        onClose={() => setRepostOpen(false)}
        onUpgrade={() => router.push('/upgrade-pro')}
        onPublish={(p) => addRepost({ mode: p.mode, text: p.text, media: p.media, by: myHandle, pro: isPro, post: { id: post.id, name: post.name, avatar: post.avatar, caption: post.caption, image: post.image, product: post.product } })}
      />
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
  color = Afryko.inkDim,
  bold,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.statText, bold && { color, fontFamily: Font.bold }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  brand: { color: Afryko.text, fontFamily: Font.bold, fontSize: 24, letterSpacing: -0.6 },
  bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: Afryko.live, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Afryko.bg },
  bellBadgeText: { color: '#fff', fontFamily: Font.bold, fontSize: 10 },
  feedState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40, gap: 12 },
  feedEmptyTitle: { color: Afryko.text, fontFamily: Font.bold, fontSize: 18 },
  feedEmptySub: { color: Afryko.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  livesRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 16 },
  liveItem: { alignItems: 'center', width: 72 },
  liveName: { color: Afryko.textDim, fontSize: 12, marginTop: 6 },
  liveTag: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    backgroundColor: Afryko.live,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  liveTagText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    backgroundColor: Afryko.violet,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Afryko.bg,
  },

  card: {
    backgroundColor: Afryko.card,
    marginBottom: 10,
    borderBottomWidth: 8,
    borderBottomColor: Afryko.surfaceAlt,
  },
  body: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  cardHeaderTap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  name: { color: Afryko.ink, fontFamily: Font.semibold, fontSize: 15, letterSpacing: -0.2 },
  time: { color: Afryko.textFaint, fontFamily: Font.regular, fontSize: 12, marginTop: 2 },
  followBtn: { backgroundColor: Afryko.violet, paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.pill },
  followBtnOn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Afryko.border, paddingHorizontal: 16 },
  followText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  followTextOn: { color: Afryko.text },

  moreBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  sensitiveOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 24 },
  sensitiveTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 16, marginTop: 4 },
  sensitiveSub: { color: '#ffffffcc', ...Type.small, textAlign: 'center' },
  sensitiveBtn: { backgroundColor: '#ffffff22', borderWidth: 1, borderColor: '#ffffff88', paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.pill, marginTop: 8 },
  sensitiveBtnText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },
  composeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52, borderBottomWidth: 1, borderBottomColor: Afryko.border },
  composeCancel: { color: Afryko.textDim, fontFamily: Font.semibold, fontSize: 15 },
  composePublish: { backgroundColor: Afryko.violet, paddingHorizontal: 20, paddingVertical: 9, borderRadius: Radius.pill },
  composePublishText: { color: '#fff', fontFamily: Font.bold, fontSize: 14 },
  composeBody: { flexDirection: 'row', gap: 12, padding: 16, flex: 1 },
  composeInput: { flex: 1, color: Afryko.text, fontSize: 19, lineHeight: 26, textAlignVertical: 'top', paddingTop: 6 },
  composeCount: { color: Afryko.textFaint, fontSize: 13, textAlign: 'right', paddingHorizontal: 16, paddingBottom: 8 },
  textPost: { color: Afryko.text, fontSize: 20, lineHeight: 28, marginBottom: 12 },
  media: { aspectRatio: 1, backgroundColor: Afryko.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  mediaImg: { ...StyleSheet.absoluteFillObject },
  heartPop: { position: 'absolute' },
  heartPopShadow: { textShadowColor: '#00000066', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
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
    backgroundColor: Afryko.surfaceAlt,
    borderRadius: Radius.md,
    padding: 8,
    marginTop: 10,
  },
  buyIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Afryko.surface, alignItems: 'center', justifyContent: 'center' },
  buyTitle: { color: Afryko.ink, fontSize: 13, fontWeight: '700' },
  buyPrice: { color: Afryko.violet, fontSize: 14, fontWeight: '800', marginTop: 1 },
  buyCta: { backgroundColor: Afryko.violet, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill },
  buyCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  stats: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { ...Type.small, color: Afryko.inkDim },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rateEmoji: { fontSize: 17 },
  caption: { ...Type.body, color: Afryko.ink, marginTop: 12 },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: Afryko.surfaceAlt, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  soundText: { ...Type.small, color: Afryko.text, maxWidth: 240 },
});
