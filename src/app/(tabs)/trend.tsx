import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Avatar } from '@/components/ui-kit';
import { BuzzBadge } from '@/components/buzz-badge';
import { PaymentSheet } from '@/components/payment-sheet';
import { RateSheet } from '@/components/rate-sheet';
import { RatingStar } from '@/components/rating-star';
import { RichText } from '@/components/rich-text';
import { ReportSheet } from '@/components/report-sheet';
import { RepostSheet } from '@/components/repost-sheet';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { NICHES, rankPosts } from '@/lib/algo';
import { bumpPostView, followUser, isFollowing, likePost, listFeed, myFollowingIds, savePost, unfollowUser, unlikePost, unsavePost } from '@/lib/db';
import { mapFeed, isSeedHandle } from '@/lib/feed-map';
import { useAuthGate } from '@/lib/auth-gate';
import { useMe } from '@/lib/me';
import { useReposts } from '@/lib/reposts';
import { avatar, face, type Post, posts as basePosts, video } from '@/lib/mock';
import { useHideOnScroll } from '@/lib/tabbar';

// Quelques vidéos verticales supplémentaires pour le défilement
const reels: Post[] = [
  ...basePosts,
  {
    id: 'r4',
    name: 'Sokhna Live',
    handle: '@sokhna.crea',
    avatar: avatar(20),
    badge: 'créateur',
    time: 'en direct',
    image: face('afylo-reel4', 700, 1300),
    likes: '15k',
    comments: '890',
    views: '210k',
    shares: '412',
    caption: 'Danse challenge du moment 💃 #afylo #dakar',
    product: { title: 'T-shirt Afylo édition limitée', price: '8 000 FCFA', commission: '25%' },
  },
  {
    id: 'r5',
    name: 'Cheikh Tech',
    handle: '@cheikh.tech',
    avatar: avatar(33),
    time: 'il y a 1 j',
    image: face('afylo-reel5', 700, 1300),
    likes: '6.4k',
    comments: '120',
    views: '58k',
    shares: '77',
    caption: 'Test du nouveau ring light 📸 lien en boutique',
    product: { title: 'Ring light pro', price: '15 000 FCFA', commission: '10%' },
  },
];

// Chaque vidéo reçoit une niche (pour l'algo + le Trend de niche)
const NICHE_MAP = ['Mode', 'Beauté', 'Musique', 'Danse', 'Tech'];
const REELS: (Post & { niche: string })[] = reels.map((r, i) => ({ ...r, niche: NICHE_MAP[i] ?? NICHES[i % NICHES.length] }));
const FOLLOWING = ['@fatou.style', '@awa.beauty']; // créateurs suivis (démo)

type TabKey = 'abonnements' | 'trend' | 'buzz';

// Score de buzz d'un contenu (les commentaires pèsent le plus) — "1,2k" -> 1200
const pc = (s?: string) => { if (!s) return 0; const n = parseFloat(s.replace(',', '.')); return /m/i.test(s) ? n * 1e6 : /k/i.test(s) ? n * 1e3 : n || 0; };
const buzzScore = (p: Post) => pc(p.comments) * 4 + pc(p.likes) * 2 + pc(p.views) * 0.05;

export default function Trend() {
  const { height, width } = useWindowDimensions();
  const scroll = useHideOnScroll();
  const [tab, setTab] = useState<TabKey>('trend');
  const [active, setActive] = useState(0);
  const [notInterested, setNotInterested] = useState<string[]>([]);
  // UNIQUEMENT les vraies publications du réseau (Supabase) — plus aucune donnée fictive.
  const [realPosts, setRealPosts] = useState<(Post & { niche: string })[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  useEffect(() => {
    listFeed()
      // Trend/Buzz/Abonnements = uniquement des VIDÉOS (pas d'image ni de carrousel) + pas de comptes démo.
      .then((rows) => setRealPosts(mapFeed(rows ?? []).filter((p) => p.video && !isSeedHandle(p.handle)).map((p, i) => ({ ...p, niche: NICHES[i % NICHES.length], _real: true } as any))))
      .catch(() => {});
    myFollowingIds().then(setFollowingIds).catch(() => {});
  }, []);

  const TABS = [
    { key: 'abonnements' as TabKey, label: 'Abonnements' },
    { key: 'trend' as TabKey, label: 'Trend' },
    { key: 'buzz' as TabKey, label: '🔥 Buzz' },
  ];

  const shown = useMemo(() => {
    const live = realPosts.filter((p) => !notInterested.includes(p.id));
    // Abonnements : publications des créateurs que tu suis, classées par l'algo Afylo.
    if (tab === 'abonnements') return rankPosts(live.filter((p) => p.authorId && followingIds.includes(p.authorId)), { notInterested });
    // Buzz : ce qui buzze réellement — engagement (commentaires/likes/vues).
    if (tab === 'buzz') return [...live].sort((a, b) => buzzScore(b) - buzzScore(a));
    // Trend : algo de recommandation Afylo (viralité + fraîcheur).
    return rankPosts(live, { notInterested });
  }, [tab, notInterested, realPosts, followingIds]);

  const notInterestedIn = (id: string) => setNotInterested((prev) => [...prev, id]);
  const scrollRef = useRef<ScrollView>(null);
  const [autoScroll, setAutoScroll] = useState(false); // défilement auto vers le reel suivant à la fin

  // Swipe horizontal entre les onglets (Abonnements ↔ Trend ↔ Buzz). On ne capte que les gestes
  // clairement horizontaux → le scroll vertical des reels reste intact.
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const tabSwipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 26 && Math.abs(g.dx) > Math.abs(g.dy) * 1.7,
      onPanResponderRelease: (_, g) => {
        const order: TabKey[] = ['abonnements', 'trend', 'buzz'];
        const i = order.indexOf(tabRef.current);
        if (g.dx <= -40 && i < order.length - 1) setTab(order[i + 1]);
        else if (g.dx >= 40 && i > 0) setTab(order[i - 1]);
      },
    }),
  ).current;

  return (
    <View style={styles.root} {...tabSwipe.panHandlers}>
      <ScrollView
        ref={scrollRef}
        key={tab}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
        {...({ dataSet: { reelscroll: '1' } } as any)}
        onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.y / height))}
        {...scroll}>
        {shown.map((r, i) => (
          <Reel
            key={r.id}
            post={r}
            index={i}
            active={i === active}
            height={height}
            width={width}
            showBuzz={tab === 'buzz' && i === 0}
            onNotInterested={() => notInterestedIn(r.id)}
            autoScroll={autoScroll}
            onToggleAutoScroll={() => setAutoScroll((v) => !v)}
            onEnded={() => { if (i < shown.length - 1) scrollRef.current?.scrollTo({ y: (i + 1) * height, animated: true }); }}
          />
        ))}
        {shown.length === 0 && (
          <View style={{ height, width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
            <Text style={styles.empty}>{tab === 'abonnements' ? 'Suis des créateurs pour voir leurs vidéos ici.' : "Rien ici pour l'instant."}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bandeau Buzz : le contenu n°1 du moment */}
      {tab === 'buzz' && shown.length > 0 && (
        <SafeAreaView edges={['top']} style={styles.buzzBanner} pointerEvents="box-none">
          <View style={styles.buzzChip}>
            <Ionicons name="flame" size={13} color="#fff" />
            <Text style={styles.buzzChipText}>Ça buzze en ce moment</Text>
          </View>
        </SafeAreaView>
      )}

      {/* En-tête flottant */}
      <SafeAreaView edges={['top']} style={styles.headerWrap} pointerEvents="box-none">
        <View style={styles.header}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} hitSlop={8}>
              <Text style={[styles.tab, tab === t.key && styles.tabActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

// Vues déjà comptées cette session (dédup pour ne pas incrémenter à chaque passage).
const countedReelViews = new Set<string>();

function Reel({ post, index, active, height, width, showBuzz, onNotInterested, autoScroll, onToggleAutoScroll, onEnded }: { post: Post; index: number; active: boolean; height: number; width: number; showBuzz?: boolean; onNotInterested: () => void; autoScroll?: boolean; onToggleAutoScroll?: () => void; onEnded?: () => void }) {
  const router = useRouter();
  const gate = useAuthGate();

  // Vraie vidéo publiée → on lit son URL réelle ; sinon (démo, ou vrai post image) on garde le mock/rien.
  const isReal = !!(post as any)._real;
  const videoSrc = post.video ? (post.videoUrl || post.image) : isReal ? null : video(index);
  const endedRef = useRef(false);
  const autoScrollRef = useRef(autoScroll); autoScrollRef.current = autoScroll;
  const activeRef = useRef(active); activeRef.current = active;
  const onEndedRef = useRef(onEnded); onEndedRef.current = onEnded;
  const player = useVideoPlayer(videoSrc, (p) => {
    p.loop = true;
    p.muted = true;
  });
  const boxRef = useRef<View>(null);
  const authorId = (post as any).authorId as string | undefined;
  useEffect(() => {
    if (active && videoSrc) player.play();
    else player.pause();
    // Compte une vue (une seule fois par session) quand le reel devient actif — uniquement les vrais posts.
    if (active && isReal && post.id && !countedReelViews.has(post.id)) { countedReelViews.add(post.id); bumpPostView(post.id).catch(() => {}); }
  }, [active, player, videoSrc]);
  // Défilement auto : la vidéo ne boucle pas ; à la fin on passe au reel suivant.
  useEffect(() => { try { player.loop = !autoScroll; } catch {} endedRef.current = false; }, [autoScroll, player, active]);
  // Web : la <video> de CE reel remplit sa zone en plein écran (cover, façon TikTok) ; la bande
  // noire du bas (reelMedia s'arrête à 96px) accueille le texte/hashtags/curseur.
  useEffect(() => {
    if (Platform.OS !== 'web' || !videoSrc) return;
    const apply = () => { const el = (boxRef.current as any)?.querySelector?.('video') as HTMLVideoElement | null; if (el) { el.style.width = '100%'; el.style.height = '100%'; el.style.objectFit = 'cover'; } };
    apply(); const t = setInterval(apply, 400); return () => clearInterval(t);
  }, [videoSrc]);
  const [liked, setLiked] = useState(false);
  const [muted, setMuted] = useState(true); // autoplay muet ; bouton pour réactiver le son
  const toggleMute = () => setMuted((m) => { const nm = !m; try { player.muted = nm; } catch {} return nm; });
  const [saved, setSaved] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const { addRepost, hasReposted } = useReposts();
  const { id: myId, handle: myHandle, isPro } = useMe();
  // État initial suivre/aimé/enregistré des VRAIS posts (léger : par reel).
  useEffect(() => {
    if (isReal && authorId && authorId !== myId) isFollowing(authorId).then(setFollowed).catch(() => {});
  }, [authorId, myId]);
  const reposted = hasReposted(post.id);
  const [rating, setRating] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const lastTap = useRef(0);

  // Curseur de temps (scrubber) : suivi + seek.
  const [pos, setPos] = useState(0);
  const barW = useRef(0);
  useEffect(() => {
    if (!videoSrc) return;
    const t = setInterval(() => {
      try {
        const d = player.duration || 0;
        const ct = player.currentTime || 0;
        setPos(d > 0 ? Math.min(1, ct / d) : 0);
        // Auto-réparation : si ce reel est actif mais que la lecture n'a pas démarré (remontage,
        // changement de compte, autoplay bloqué), on relance. Garantit que la vidéo active tourne toujours.
        if (activeRef.current && !player.playing) player.play();
        // Défilement auto : à la fin de la vidéo, on passe au reel suivant (une seule fois).
        if (autoScrollRef.current && activeRef.current && d > 0 && ct >= d - 0.4 && !endedRef.current) { endedRef.current = true; onEndedRef.current?.(); }
      } catch {}
    }, 250);
    return () => clearInterval(t);
  }, [player, videoSrc]);
  const seek = (frac: number) => { try { const d = player.duration || 0; if (d > 0) player.currentTime = Math.max(0, Math.min(d, frac * d)); setPos(Math.max(0, Math.min(1, frac))); } catch {} };
  const scrubResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => barW.current > 0 && seek(e.nativeEvent.locationX / barW.current),
    onPanResponderMove: (e) => barW.current > 0 && seek(e.nativeEvent.locationX / barW.current),
  })).current;

  const changeSpeed = (s: number) => { setSpeed(s); try { player.playbackRate = s; } catch {} };
  // Persistance réelle (seulement les vrais posts ; ignorée pour les démos/mock). Fallback silencieux.
  const persistLike = (next: boolean) => { if (isReal && post.id) (next ? likePost(post.id) : unlikePost(post.id)).catch(() => {}); };
  const onTap = () => { const now = Date.now(); if (now - lastTap.current < 300 && gate('aimer')) setLiked((v) => { if (!v) persistLike(true); return true; }); lastTap.current = now; };

  const like = () => { if (gate('aimer')) setLiked((v) => { const n = !v; persistLike(n); return n; }); };
  const save = () => { if (gate('enregistrer')) setSaved((v) => { const n = !v; if (isReal && post.id) (n ? savePost(post.id) : unsavePost(post.id)).catch(() => {}); return n; }); };
  const toggleFollow = () => { if (gate('suivre')) setFollowed((v) => { const n = !v; if (isReal && authorId) (n ? followUser(authorId) : unfollowUser(authorId)).catch(() => {}); return n; }); };
  const republish = () => { if (gate('republier')) setRepostOpen(true); };
  const sharePost = async () => { try { await Share.share({ message: `${post.name} sur Afylo : ${post.caption || ''}` }); } catch {} };
  const rate = () => { if (gate('noter')) setRateOpen(true); };
  const buy = () => { if (gate('acheter')) setPayOpen(true); };
  // Ouvre la fiche produit (vraie page de vente). Repli : paiement direct si pas d'id (démo).
  const openProduct = () => { if (post.product?.id) router.push({ pathname: '/product/[id]', params: { id: post.product.id } }); else buy(); };
  const openComments = () => router.push({ pathname: '/comments/[id]', params: { id: post.id, image: post.image, name: post.name } });
  const openMention = (h: string) => router.push({ pathname: '/creator/[id]', params: { id: h } });
  const openTag = (t: string) => router.push({ pathname: '/search', params: { q: t } });

  return (
    <View style={{ height, width, backgroundColor: '#000' }} {...({ dataSet: { reel: '1' } } as any)}>
      {/* Zone média : s'arrête au-dessus d'une bande noire (texte + curseur) façon TikTok. Vidéo en plein écran (cover). */}
      <View style={styles.reelMedia}>
        {!post.video && <Image source={{ uri: post.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />}
        {videoSrc && (
          <View ref={boxRef} style={StyleSheet.absoluteFill} pointerEvents="none">
            <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
          </View>
        )}
        <LinearGradient colors={['#00000000', '#00000000', '#00000088']} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <Pressable style={StyleSheet.absoluteFill} onPress={onTap} onLongPress={() => setOptionsOpen(true)} delayLongPress={250} />
      </View>
      {speed !== 1 && <View style={styles.speedTag}><Text style={styles.speedTagText}>{speed}×</Text></View>}

      {/* Curseur de temps (scrubber) — dans la bande noire du bas, déplaçable (grande zone de touch) */}
      {videoSrc && (
        <View style={styles.reelScrubWrap} onLayout={(e) => (barW.current = e.nativeEvent.layout.width)} {...scrubResponder.panHandlers}>
          <View style={styles.reelScrubTrack}>
            <View style={[styles.reelScrubFill, { width: `${pos * 100}%` }]} />
          </View>
          <View style={[styles.reelScrubThumb, { left: `${pos * 100}%` }]} />
        </View>
      )}


      {/* Rail d'actions à droite */}
      <View style={styles.rail}>
        <View style={{ marginBottom: 12 }}>
          <Avatar uri={post.avatar} size={48} ring />
          {/* Suivre l'auteur en 1 tap (pas sur mes propres posts) */}
          {authorId && authorId !== myId && (
            <Pressable onPress={toggleFollow} style={[styles.followDot, followed && styles.followDotOn]} hitSlop={8}>
              <Ionicons name={followed ? 'checkmark' : 'add'} size={13} color="#fff" />
            </Pressable>
          )}
        </View>
        <Action
          node={reaction ? <Text style={{ fontSize: 30 }}>{reaction}</Text> : <RatingStar fill={rating > 0 ? rating / 10 : liked ? 1 : 0} size={32} color={Afylo.violet2} empty="#fff" />}
          label={rating > 0 ? `${rating}/10` : liked ? 'Aimé' : 'Noter'}
          color={rating > 0 || liked ? Afylo.violet2 : '#fff'}
          onPress={like}
          onLongPress={rate}
        />
        <Action icon="chatbubble-ellipses" label={post.comments} onPress={openComments} />
        <Action icon={saved ? 'bookmark' : 'bookmark-outline'} label="Enreg." color={saved ? Afylo.gold : '#fff'} onPress={save} />
        <Action icon="repeat" label={reposted ? 'Republié' : 'Republier'} color={reposted ? Afylo.green : '#fff'} onPress={republish} />
        {/* Son : au-dessus de Partager (n'écrase plus le badge Acheter en bas) */}
        {videoSrc && <Action icon={muted ? 'volume-mute' : 'volume-high'} label={muted ? 'Muet' : 'Son'} color={muted ? '#fff' : Afylo.violet2} onPress={toggleMute} />}
        <Action icon="arrow-redo" label="Partager" onPress={sharePost} />
      </View>

      {/* Infos en bas */}
      <SafeAreaView edges={['bottom']} style={styles.bottom} pointerEvents="box-none">
        {/* Carte produit AVANT le nom (façon TikTok Shop) : achat immédiat, sans scroll */}
        {post.product && (
          <Pressable style={styles.buyBar} onPress={openProduct}>
            <View style={styles.buyIcon}><Ionicons name="bag-handle" size={16} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.buyTitle} numberOfLines={1}>{post.product.title}</Text>
              <View style={styles.buyPriceRow}>
                <Text style={styles.buyPrice}>{post.product.price}</Text>
                {post.product.priceOld && <Text style={styles.buyPriceOld}>{post.product.priceOld}</Text>}
              </View>
            </View>
            <View style={styles.buyCta}><Text style={styles.buyCtaText}>Acheter</Text></View>
          </Pressable>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.name}>{post.name}</Text>
          {showBuzz && <BuzzBadge />}
          {post.time === 'en direct' && (
            <View style={styles.liveTag}>
              <View style={styles.dot} />
              <Text style={styles.liveTagText}>LIVE</Text>
            </View>
          )}
        </View>
        <RichText text={post.caption || ''} style={styles.caption} linkStyle={styles.captionLink} numberOfLines={2} onPressMention={openMention} onPressTag={openTag} />
      </SafeAreaView>

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

      {/* Menu d'options (appui long) */}
      <Modal visible={optionsOpen} transparent animationType="slide" onRequestClose={() => setOptionsOpen(false)}>
        <Pressable style={styles.optOverlay} onPress={() => setOptionsOpen(false)}>
          <View style={styles.optSheet}>
            <View style={styles.optGrip} />
            <View style={styles.optGrid}>
              <OptItem icon="download-outline" label="Télécharger" onPress={() => setOptionsOpen(false)} />
              <OptItem icon="heart-dislike-outline" label="Pas intéressé" onPress={() => { onNotInterested(); setOptionsOpen(false); }} />
              <OptItem icon="flag-outline" label="Signaler" onPress={() => { setOptionsOpen(false); setReportOpen(true); }} />
              <OptItem icon="storefront-outline" label="La boutique" onPress={() => { setOptionsOpen(false); router.push({ pathname: '/creator/[id]', params: { id: post.handle, name: post.name, avatar: post.avatar, section: 'boutique' } }); }} />
            </View>

            <View style={styles.optRow}>
              <Ionicons name="speedometer-outline" size={20} color={Afylo.text} />
              <Text style={styles.optRowLabel}>Vitesse</Text>
              <View style={styles.speedChips}>
                {[0.5, 1, 1.5, 2].map((s) => (
                  <Pressable key={s} onPress={() => changeSpeed(s)} style={[styles.speedChip, speed === s && styles.speedChipOn]}>
                    <Text style={[styles.speedChipText, speed === s && { color: '#fff' }]}>{s}×</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable style={styles.optLine} onPress={() => { player.muted = !player.muted; }}>
              <Ionicons name="headset-outline" size={20} color={Afylo.text} />
              <Text style={styles.optLineText}>Son en arrière-plan</Text>
            </Pressable>
            <Pressable style={styles.optLine} onPress={() => onToggleAutoScroll?.()}>
              <Ionicons name="play-forward-outline" size={20} color={Afylo.text} />
              <Text style={[styles.optLineText, { flex: 1 }]}>Défilement automatique</Text>
              <Ionicons name={autoScroll ? 'toggle' : 'toggle-outline'} size={32} color={autoScroll ? Afylo.violet : Afylo.textFaint} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} />

      <RepostSheet
        visible={repostOpen}
        isPro={isPro}
        onUpgrade={() => router.push('/upgrade-pro')}
        post={{ id: post.id, name: post.name, avatar: post.avatar, caption: post.caption, image: post.image, product: post.product }}
        onClose={() => setRepostOpen(false)}
        onPublish={(p) => addRepost({ mode: p.mode, text: p.text, media: p.media, by: myHandle, pro: isPro, post: { id: post.id, name: post.name, avatar: post.avatar, caption: post.caption, image: post.image, product: post.product } })}
      />
    </View>
  );
}

function OptItem({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.optItem} onPress={onPress}>
      <View style={styles.optIcon}><Ionicons name={icon} size={24} color={Afylo.text} /></View>
      <Text style={styles.optItemText}>{label}</Text>
    </Pressable>
  );
}

function Action({ icon, node, label, color = '#fff', onPress, onLongPress }: { icon?: keyof typeof Ionicons.glyphMap; node?: React.ReactNode; label: string; color?: string; onPress?: () => void; onLongPress?: () => void }) {
  return (
    <Pressable style={styles.action} onPress={onPress} onLongPress={onLongPress} delayLongPress={260} hitSlop={6}>
      {node ?? <Ionicons name={icon!} size={32} color={color} />}
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingTop: 6 },
  tab: { color: '#ffffff99', fontSize: 15, fontWeight: '600' },
  tabActive: { color: '#fff', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 8 },
  empty: { color: '#ffffffaa', fontSize: 15, fontFamily: Font.medium },
  nicheTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 20, marginTop: 12, textAlign: 'center' },
  nicheSub: { color: '#ffffffbb', fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  nicheGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 20 },
  nicheChip: { backgroundColor: '#ffffff1A', borderWidth: 1, borderColor: '#ffffff44', paddingHorizontal: 18, paddingVertical: 11, borderRadius: Radius.pill },
  nicheChipText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },
  nicheActiveWrap: { position: 'absolute', top: 44, left: 0, right: 0, alignItems: 'center' },
  nicheActive: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Afylo.violet, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill },
  nicheActiveText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },
  buzzBanner: { position: 'absolute', top: 44, left: 0, right: 0, alignItems: 'center' },
  buzzChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF2D55', paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill },
  buzzChipText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },
  reelMedia: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 96, backgroundColor: '#000' },
  reelScrubWrap: { position: 'absolute', left: 12, right: 12, bottom: 62, height: 24, justifyContent: 'center' },
  reelScrubTrack: { height: 2.5, borderRadius: 2, backgroundColor: '#ffffff3A', overflow: 'hidden' },
  reelScrubFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#ffffffdd', borderRadius: 2 },
  reelScrubThumb: { position: 'absolute', top: '50%', width: 11, height: 11, borderRadius: 6, backgroundColor: '#fff', marginLeft: -5.5, marginTop: -5.5 },
  speedTag: { position: 'absolute', top: 90, alignSelf: 'center', backgroundColor: '#000000AA', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  speedTagText: { color: '#fff', fontFamily: Font.bold, fontSize: 12 },

  optOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  optSheet: { backgroundColor: Afylo.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 30 },
  optGrip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 14 },
  optGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  optItem: { alignItems: 'center', gap: 6, width: 74 },
  optIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: Afylo.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  optItemText: { ...Type.caption, color: Afylo.text, textAlign: 'center' },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: Afylo.border, marginTop: 8 },
  optRowLabel: { ...Type.body, color: Afylo.text, flex: 1 },
  speedChips: { flexDirection: 'row', gap: 6, backgroundColor: Afylo.surfaceAlt, borderRadius: Radius.pill, padding: 3 },
  speedChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  speedChipOn: { backgroundColor: Afylo.violet },
  speedChipText: { ...Type.small, fontFamily: Font.semibold, color: Afylo.text },
  optLine: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: Afylo.border },
  optLineText: { ...Type.body, color: Afylo.text },

  rail: { position: 'absolute', right: 12, bottom: 160, alignItems: 'center', gap: 20 },
  followDot: { position: 'absolute', bottom: -9, alignSelf: 'center', left: 14, width: 20, height: 20, borderRadius: 10, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  followDotOn: { backgroundColor: Afylo.green },
  action: { alignItems: 'center', gap: 3 },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 90 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  name: { color: '#fff', fontSize: 17, fontWeight: '800' },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Afylo.live, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20, width: '78%' },
  captionLink: { color: '#9DB4FF', fontFamily: Font.semibold },
  buyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#000000aa',
    borderWidth: 1,
    borderColor: '#ffffff33',
    borderRadius: 14,
    padding: 8,
    marginBottom: 10,
    width: '86%',
  },
  buyIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center' },
  buyTitle: { color: '#fff', fontSize: 13, fontFamily: Font.semibold },
  buyPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 1 },
  buyPrice: { color: Afylo.gold, fontSize: 14, fontWeight: '800' },
  buyPriceOld: { color: '#ffffff99', fontSize: 11, textDecorationLine: 'line-through' },
  buyCta: { backgroundColor: Afylo.violet, paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill },
  buyCtaText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
